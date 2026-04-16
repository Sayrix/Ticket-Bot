/*
Ticket-Bot is licensed under the GNU Affero General Public License,
version 3 only ("AGPL-3.0-only"). See LICENSE.md for the full license text.

Additional Term under GNU AGPL v3, Section 7(b):

You are required to preserve and display, in a location clearly visible
to end users interacting with the bot (such as bot embeds, the bot's
"Bio" Discord profile, status, or equivalent), a notice that the
software is powered by Ticket-Bot, including a link to the original
project repository or to its website.

This notice must not be removed, obscured, or replaced.
*/

import type {
	APIButtonComponentWithCustomId,
	APIChatInputApplicationCommandInteraction,
	APIMessage,
	APIMessageComponentInteraction,
	APIModalSubmitInteraction
} from "@discordjs/core";
import { ButtonStyle, ComponentType, MessageFlags, TextInputStyle } from "@discordjs/core";
import { eq } from "drizzle-orm";
import { createCustomId } from "@/core/custom-id";
import { editReply, reply, showModal } from "@/core/respond";
import type { BotApp, CommandExecutionContext, ComponentExecutionContext } from "@/core/types";
import { ticketsTable } from "@/db/schema";
import { getTicketType, hasTicketStaffAccess } from "@/features/tickets/config-access";
import {
	appendMessageButton,
	finalizeMessageTemplate,
	hasMessageComponentCustomId,
	loadMessageTemplate
} from "@/features/tickets/messages";
import { getInvitedUserIds, revokeTicketParticipantAccess } from "@/features/tickets/participants";
import { findTicketByChannel, getOpenTicketByChannel } from "@/features/tickets/records";
import { startTranscriptJob } from "@/features/tickets/transcripts";
import { getInteractionUser, getMemberRoleIds } from "@/features/tickets/utils";

const DEFAULT_CLOSE_DM_MESSAGE = "tickets/ticket-closed-dm";
const DEFAULT_CLOSE_CHANNEL_MESSAGE = "tickets/ticket-closed";

export async function executeCloseCommand(
	context: CommandExecutionContext,
	interaction: APIChatInputApplicationCommandInteraction
) {
	await beginCloseFlow(context.app, interaction);
}

export async function handleCloseButton(context: ComponentExecutionContext, interaction: APIMessageComponentInteraction) {
	await beginCloseFlow(context.app, interaction);
}

export async function handleDeleteClosedTicketButton(
	context: ComponentExecutionContext,
	interaction: APIMessageComponentInteraction
) {
	const channelId = interaction.channel_id;

	if (!channelId) {
		await reply(context.app, interaction, {
			content: "This interaction was not used in a ticket channel.",
			flags: MessageFlags.Ephemeral
		});
		return;
	}

	const manageable = await getDeletableTicket(context.app, channelId, getMemberRoleIds(interaction));

	if (!manageable.ok) {
		await reply(context.app, interaction, {
			content: manageable.message,
			flags: MessageFlags.Ephemeral
		});
		return;
	}

	await reply(context.app, interaction, {
		content: "Deleting ticket channel...",
		flags: MessageFlags.Ephemeral
	});
	await context.app.client.api.channels.delete(channelId);
}

export async function handleCloseReasonSubmit(context: ComponentExecutionContext, interaction: APIModalSubmitInteraction) {
	const reason = readCloseReason(interaction);
	await closeTicket(context.app, interaction, reason);
}

async function beginCloseFlow(
	app: BotApp,
	interaction: APIChatInputApplicationCommandInteraction | APIMessageComponentInteraction
) {
	const closable = await getClosableTicket(
		app,
		interaction.channel_id,
		getMemberRoleIds(interaction),
		getInteractionUser(interaction).id,
		true
	);

	if (!closable.ok) {
		await reply(app, interaction, {
			content: closable.message,
			flags: MessageFlags.Ephemeral
		});
		return;
	}

	if (app.config.tickets.close.askForReason) {
		await showModal(app, interaction, {
			custom_id: createCustomId("tickets", "submit-close-reason"),
			title: "Close Ticket",
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.TextInput,
							custom_id: "reason",
							label: "Reason",
							style: TextInputStyle.Paragraph,
							required: false,
							max_length: 500,
							placeholder: "Why is this ticket being closed?"
						}
					]
				}
			]
		});
		return;
	}

	await closeTicket(app, interaction, null);
}

async function closeTicket(
	app: BotApp,
	interaction: APIChatInputApplicationCommandInteraction | APIMessageComponentInteraction | APIModalSubmitInteraction,
	reason: string | null
) {
	const channelId = interaction.channel_id;

	if (!channelId) {
		await reply(app, interaction, {
			content: "This interaction was not used in a ticket channel.",
			flags: MessageFlags.Ephemeral
		});
		return;
	}

	const roleIds = getMemberRoleIds(interaction);
	const closable = await getClosableTicket(app, channelId, roleIds, getInteractionUser(interaction).id, true);

	if (!closable.ok) {
		await reply(app, interaction, {
			content: closable.message,
			flags: MessageFlags.Ephemeral
		});
		return;
	}

	const status = createCloseStatusUpdater(app, interaction);
	await status.start(app.config.tickets.close.createTranscript ? "Preparing transcript..." : "Closing ticket...");

	const { ticket, ticketType } = closable;
	const closer = getInteractionUser(interaction);
	const normalizedReason = normalizeCloseReason(reason);

	// Mark the ticket as closed immediately so repeated button presses or `/close`
	// attempts during transcript generation do not start duplicate close flows.
	await app.db
		.update(ticketsTable)
		.set({
			closedAt: Date.now(),
			closedBy: closer.id,
			closedReason: normalizedReason
		})
		.where(eq(ticketsTable.channelId, ticket.channelId));

	if (!app.config.tickets.close.deleteChannelOnClose) {
		await status.update("Updating ticket access...");
		await revokeTicketParticipantAccess(app, ticket.channelId, ticket.createdBy);

		for (const invitedUserId of getInvitedUserIds(ticket)) {
			await revokeTicketParticipantAccess(app, ticket.channelId, invitedUserId);
		}
	}

	// Keep the original ticket message in sync with the closed state when the
	// channel is preserved for staff review.
	await disableTicketActionButtons(app, ticket.channelId, ticket.creationMessageId);

	if (!app.config.tickets.close.deleteChannelOnClose) {
		await moveClosedTicketChannel(app, ticket.channelId);
	}

	const transcriptJob = app.config.tickets.close.createTranscript
		? await startTranscriptJob(app, ticket.channelId, {
				onStatus: (content) => status.update(content)
			})
		: null;
	const transcriptUrl = transcriptJob ? await transcriptJob.waitForResult() : null;

	if (app.config.tickets.close.createTranscript && !transcriptUrl) {
		await status.update("Transcript is still processing. Finishing ticket close...");
	}

	const closeMessageTokens = {
		channelId: ticket.channelId,
		claimStatus: formatClaimStatus(ticket.claimedBy),
		claimerId: ticket.claimedBy ?? "",
		claimerMention: ticket.claimedBy ? `<@${ticket.claimedBy}>` : "",
		closerId: closer.id,
		closerMention: `<@${closer.id}>`,
		closerName: closer.username,
		reason: normalizedReason,
		transcriptStatus: formatTranscriptStatus(transcriptUrl),
		transcriptUrl: transcriptUrl ?? "",
		userId: ticket.createdBy
	};

	if (app.config.tickets.close.dmUserOnClose) {
		await status.update("Sending close confirmation...");
		await sendCloseDm(app, ticket.createdBy, ticketType, closeMessageTokens);
	}

	if (app.config.tickets.close.deleteChannelOnClose) {
		await editReply(app, interaction, {
			content: transcriptUrl
				? "Ticket closed. The transcript is ready and the channel will now be deleted."
				: "Ticket closed. The channel will now be deleted."
		});
		await app.client.api.channels.delete(ticket.channelId);
		return;
	}

	await status.update("Posting close summary...");
	await app.client.api.channels.createMessage(ticket.channelId, await buildCloseChannelMessage(app, ticketType, closeMessageTokens));

	await status.update("Ticket closed.");
}

async function getClosableTicket(
	app: BotApp,
	channelId: string | undefined,
	roleIds: string[],
	actorId: string,
	enforcePermission: boolean
) {
	const openTicket = await getOpenTicketByChannel(app, channelId);

	if (!openTicket.ok) {
		return openTicket;
	}

	const { ticket, ticketType } = openTicket;

	if (enforcePermission && app.config.tickets.close.staffOnly && !hasTicketStaffAccess(app, ticketType, roleIds)) {
		return {
			ok: false as const,
			message: "Only staff can close this ticket."
		};
	}

	if (app.config.tickets.claims.enabled && app.config.tickets.claims.mode === "strict") {
		if (!ticket.claimedBy) {
			return {
				ok: false as const,
				message: "This ticket must be claimed before it can be closed."
			};
		}

		if (ticket.claimedBy !== actorId) {
			return {
				ok: false as const,
				message: "Only the current claimer can close this ticket."
			};
		}
	}

	return {
		ok: true as const,
		ticket,
		ticketType
	};
}

async function getDeletableTicket(app: BotApp, channelId: string | undefined, roleIds: string[]) {
	if (!channelId) {
		return {
			ok: false as const,
			message: "This interaction was not used in a ticket channel."
		};
	}

	const ticket = await findTicketByChannel(app, channelId);

	if (!ticket) {
		return {
			ok: false as const,
			message: "This channel is not a ticket."
		};
	}

	if (!ticket.closedAt) {
		return {
			ok: false as const,
			message: "Only closed tickets can be deleted from this button."
		};
	}

	const ticketType = getTicketType(app, ticket.type);

	if (!hasTicketStaffAccess(app, ticketType, roleIds)) {
		return {
			ok: false as const,
			message: "Only staff can delete this ticket."
		};
	}

	return {
		ok: true as const,
		ticket,
		ticketType
	};
}

async function disableTicketActionButtons(app: BotApp, channelId: string, messageId: string) {
	const message = await app.client.api.channels.getMessage(channelId, messageId).catch(() => null);
	const disabledButtonIds = new Set([
		createCustomId("tickets", "claim"),
		createCustomId("tickets", "close"),
		createCustomId("tickets", "unclaim")
	]);

	if (!message?.components?.length) {
		return;
	}

	const nextComponents = message.components.map((row) => {
		if (row.type !== ComponentType.ActionRow) {
			return row;
		}

		return {
			...row,
			components: row.components.map((component) => {
				if (
					component.type !== ComponentType.Button ||
					!("custom_id" in component) ||
					!disabledButtonIds.has(component.custom_id)
				) {
					return component;
				}

				return {
					...component,
					disabled: true
				};
			})
		};
	}) as APIMessage["components"];

	await app.client.api.channels.editMessage(channelId, messageId, {
		components: nextComponents
	});
}

async function moveClosedTicketChannel(app: BotApp, channelId: string) {
	const categoryId = app.config.tickets.close.closeTicketCategoryId?.trim();

	if (!categoryId) {
		return;
	}

	await app.client.api.channels.edit(channelId, {
		parent_id: categoryId
	});
}

async function sendCloseDm(
	app: BotApp,
	userId: string,
	ticketType: ReturnType<typeof getTicketType>,
	tokens: {
		channelId: string;
		closerId: string;
		closerMention: string;
		closerName: string;
		reason: string;
		transcriptStatus: string;
		transcriptUrl: string;
		userId: string;
	}
) {
	const dmChannel = await app.client.api.users.createDM(userId).catch(() => null);

	if (!dmChannel?.id) {
		return;
	}

	const messageTemplate = await loadMessageTemplate(resolveCloseDmMessageReference(app, ticketType), tokens);

	await app.client.api.channels
		.createMessage(dmChannel.id, {
			...finalizeMessageTemplate(messageTemplate)
		})
		.catch(() => undefined);
}

async function buildCloseChannelMessage(
	app: BotApp,
	ticketType: ReturnType<typeof getTicketType>,
	tokens: {
		channelId: string;
		closerId: string;
		closerMention: string;
		closerName: string;
		claimStatus: string;
		claimerId: string;
		claimerMention: string;
		reason: string;
		transcriptStatus: string;
		transcriptUrl: string;
		userId: string;
	}
) {
	const deleteButtonCustomId = createCustomId("tickets", "delete-closed");
	const messageTemplate = await loadMessageTemplate(
		resolveCloseChannelMessageReference(app, ticketType),
		{
			...tokens,
			deleteButtonCustomId
		}
	);

	return finalizeMessageTemplate(
		appendMessageButton(
			messageTemplate,
			!hasMessageComponentCustomId(messageTemplate, deleteButtonCustomId)
				? ({
						type: ComponentType.Button,
						custom_id: deleteButtonCustomId,
						label: "Delete Ticket",
						style: ButtonStyle.Danger
					} satisfies APIButtonComponentWithCustomId)
				: undefined
		)
	);
}

function resolveCloseDmMessageReference(app: BotApp, ticketType: ReturnType<typeof getTicketType>) {
	return ticketType.close?.dmMessage ?? app.config.tickets.close.dmMessage ?? DEFAULT_CLOSE_DM_MESSAGE;
}

function resolveCloseChannelMessageReference(app: BotApp, ticketType: ReturnType<typeof getTicketType>) {
	return ticketType.close?.channelMessage ?? app.config.tickets.close.channelMessage ?? DEFAULT_CLOSE_CHANNEL_MESSAGE;
}

function createCloseStatusUpdater(
	app: BotApp,
	interaction: APIChatInputApplicationCommandInteraction | APIMessageComponentInteraction | APIModalSubmitInteraction
) {
	let hasStarted = false;
	let lastContent = "";

	return {
		start: async (content: string) => {
			hasStarted = true;
			lastContent = content;
			await reply(app, interaction, {
				content,
				flags: MessageFlags.Ephemeral
			});
		},
		update: async (content: string) => {
			if (!hasStarted || content === lastContent) {
				return;
			}

			lastContent = content;
			await editReply(app, interaction, {
				content
			}).catch(() => undefined);
		}
	};
}

function formatTranscriptStatus(transcriptUrl: string | null) {
	return transcriptUrl ? `[Open Transcript](${transcriptUrl})` : "Unavailable or still processing.";
}

function formatClaimStatus(claimedBy: string | null) {
	return claimedBy ? `Claimed by <@${claimedBy}>` : "Unclaimed";
}

function readCloseReason(interaction: APIModalSubmitInteraction) {
	for (const component of interaction.data.components) {
		if (!("components" in component)) {
			continue;
		}

		for (const child of component.components) {
			if (child.type === ComponentType.TextInput && child.custom_id === "reason" && "value" in child) {
				return child.value.trim() || null;
			}
		}
	}

	return null;
}

function normalizeCloseReason(reason: string | null) {
	return reason?.trim() || "No reason provided.";
}

/*
Ticket-Bot is licensed under the GNU Affero General Public License,
version 3 only ("AGPL-3.0-only"). See LICENSE.md for the full license text.

Additional Term under GNU AGPL v3, Section 7(b):

You are required to preserve and display, in a location clearly visible
to end users interacting with the bot (such as bot embeds, the bot's
"Bio" Discord profile, status, or equivalent), a notice that the
software is powered by Ticket-Bot, including a link to the original
project repository or to its website.

This notice must not be removed, obscured, or replaced.
*/

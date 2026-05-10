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
	APIActionRowComponent,
	APIButtonComponentWithCustomId,
	APIChatInputApplicationCommandInteraction,
	APIMessage,
	APIMessageComponentInteraction,
	APIModalSubmitInteraction
} from "@discordjs/core";
import { ButtonStyle, ComponentType, MessageFlags, OverwriteType, TextInputStyle } from "@discordjs/core";
import { DiscordAPIError } from "@discordjs/rest";
import {
	type APIComponentInMessageActionRow,
	type APIContainerComponent,
	type RESTAPIChannelPatchOverwrite,
	RESTJSONErrorCodes
} from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import { createCustomId } from "@/core/custom-id";
import { editReply, reply, showModal } from "@/core/respond";
import type { BotApp, CommandExecutionContext, ComponentExecutionContext } from "@/core/types";
import { ticketsTable } from "@/db/schema";
import { sendTicketLog } from "@/features/logs/service";
import { createTicketLogContext } from "@/features/logs/utils";
import { getTicketType, hasTicketStaffAccess } from "@/features/tickets/config-access";
import {
	appendMessageButton,
	finalizeMessageTemplate,
	hasMessageComponentCustomId,
	loadMessageTemplate
} from "@/features/tickets/messages";
import { getInvitedUserIds, revokeTicketParticipantAccess } from "@/features/tickets/participants";
import { findTicketByChannel, getOpenTicketByChannel } from "@/features/tickets/records";
import { formatClaimStatus, formatTranscriptStatus, getDefaultNoReason } from "@/features/tickets/text";
import { startTranscriptJob } from "@/features/tickets/transcripts";
import { escapeDiscordMarkdown, getInteractionUser, getMemberRoleIds, getModalTextInputValues } from "@/features/tickets/utils";

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
			content: context.app.LL.tickets.records.not_ticket_channel(),
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
		content: context.app.LL.tickets.close.delete_channel_start(),
		flags: MessageFlags.Ephemeral
	});
	void sendTicketLog(context.app, {
		kind: "ticketDelete",
		actor: getInteractionUser(interaction),
		reason: manageable.ticket.closedReason ?? getDefaultNoReason(context.app),
		transcriptUrl: manageable.ticket.transcriptUrl,
		ticket: createTicketLogContext(manageable.ticket, manageable.ticketType.name)
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
			title: app.LL.tickets.close.modal.title(),
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.TextInput,
							custom_id: "reason",
							label: app.LL.tickets.close.modal.reason_label(),
							style: TextInputStyle.Paragraph,
							required: false,
							max_length: 500,
							placeholder: app.LL.tickets.close.modal.reason_placeholder()
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
			content: app.LL.tickets.records.not_ticket_channel(),
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
	await status.start(
		app.config.tickets.close.createTranscript
			? app.LL.tickets.close.status.preparing_transcript()
			: app.LL.tickets.close.status.closing_ticket()
	);

	const { ticket, ticketType } = closable;
	const closer = getInteractionUser(interaction);
	const normalizedReason = normalizeCloseReason(app, reason);

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
		const invitedUserIds = getInvitedUserIds(ticket);

		runCloseTaskInBackground(app, ticket.channelId, "disable ticket actions", async () => {
			// Preserve the original ticket message while preventing new actions.
			await disableTicketActionButtons(app, ticket.channelId, ticket.creationMessageId);
		});
		await status.update(app.LL.tickets.close.status.updating_access());
		await removeClosedTicketParticipantAccess(app, ticket.channelId, ticket.createdBy, invitedUserIds);
	}

	const transcriptJob = app.config.tickets.close.createTranscript
		? await startTranscriptJob(app, ticket.channelId, {
				onStatus: (content) => status.update(content)
			})
		: null;

	if (!app.config.tickets.close.deleteChannelOnClose) {
		runCloseTaskInBackground(app, ticket.channelId, "move the closed ticket channel", async () => {
			await moveClosedTicketChannel(app, ticket.channelId);
		});
	}

	const transcriptUrl = transcriptJob ? await transcriptJob.waitForResult() : null;

	if (app.config.tickets.close.createTranscript && !transcriptUrl) {
		await status.update(app.LL.tickets.close.status.transcript_still_processing());
	}

	const closeMessageTokens = {
		channelId: ticket.channelId,
		claimStatus: formatClaimStatus(app, ticket.claimedBy),
		claimerId: ticket.claimedBy ?? "",
		claimerMention: ticket.claimedBy ? `<@${ticket.claimedBy}>` : "",
		closerId: closer.id,
		closerMention: `<@${closer.id}>`,
		closerName: escapeDiscordMarkdown(closer.username),
		reason: normalizedReason,
		transcriptStatus: formatTranscriptStatus(app, transcriptUrl),
		transcriptUrl: transcriptUrl ?? "",
		userId: ticket.createdBy
	};
	void sendTicketLog(app, {
		kind: "ticketClose",
		actor: closer,
		reason: normalizedReason,
		transcriptUrl,
		ticket: createTicketLogContext(ticket, ticketType.name)
	});

	if (app.config.tickets.close.deleteChannelOnClose && app.config.tickets.close.dmUserOnClose) {
		await status.update(app.LL.tickets.close.status.sending_close_confirmation());
		await sendCloseDm(app, ticket.createdBy, ticketType, closeMessageTokens);
	}

	if (app.config.tickets.close.deleteChannelOnClose) {
		void sendTicketLog(app, {
			kind: "ticketDelete",
			actor: closer,
			reason: normalizedReason,
			transcriptUrl,
			ticket: createTicketLogContext(ticket, ticketType.name)
		});
		await editReply(app, interaction, {
			content: transcriptUrl ? app.LL.tickets.close.deleted_with_transcript() : app.LL.tickets.close.deleted_without_transcript()
		});
		await app.client.api.channels.delete(ticket.channelId);
		return;
	}

	const closeSummaryMessage = await buildCloseChannelMessage(app, ticketType, closeMessageTokens);
	const closeTasks: Promise<unknown>[] = [app.client.api.channels.createMessage(ticket.channelId, closeSummaryMessage)];

	if (app.config.tickets.close.dmUserOnClose) {
		closeTasks.push(sendCloseDm(app, ticket.createdBy, ticketType, closeMessageTokens));
	}

	await status.update(
		app.config.tickets.close.dmUserOnClose
			? app.LL.tickets.close.status.sending_close_updates()
			: app.LL.tickets.close.status.posting_close_summary()
	);
	await Promise.all(closeTasks);

	await status.update(app.LL.tickets.close.status.closed());
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
			message: app.LL.tickets.close.only_staff()
		};
	}

	if (app.config.tickets.claims.enabled && app.config.tickets.claims.mode === "strict") {
		if (!ticket.claimedBy) {
			return {
				ok: false as const,
				message: app.LL.tickets.close.must_be_claimed()
			};
		}

		if (ticket.claimedBy !== actorId) {
			return {
				ok: false as const,
				message: app.LL.tickets.close.only_current_claimer()
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
			message: app.LL.tickets.records.not_ticket_channel()
		};
	}

	const ticket = await findTicketByChannel(app, channelId);

	if (!ticket) {
		return {
			ok: false as const,
			message: app.LL.tickets.close.not_ticket()
		};
	}

	if (!ticket.closedAt) {
		return {
			ok: false as const,
			message: app.LL.tickets.close.only_closed_delete()
		};
	}

	const ticketType = getTicketType(app, ticket.type);

	if (!hasTicketStaffAccess(app, ticketType, roleIds)) {
		return {
			ok: false as const,
			message: app.LL.tickets.close.only_staff_delete()
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

	const nextComponents: APIMessage["components"] = disableNestedTicketActionButtons(message.components, disabledButtonIds);

	await app.client.api.channels.editMessage(channelId, messageId, {
		components: nextComponents
	});
}

function disableNestedTicketActionButtons(
	components: NonNullable<APIMessage["components"]>,
	disabledButtonIds: Set<string>
): NonNullable<APIMessage["components"]> {
	const nextComponents: NonNullable<APIMessage["components"]> = components.map((component) => {
		if (component.type === ComponentType.ActionRow) {
			return disableTicketActionRow(component, disabledButtonIds);
		}

		if (component.type === ComponentType.Container) {
			return disableTicketActionContainer(component, disabledButtonIds);
		}

		return component;
	});

	return nextComponents;
}

function disableTicketActionContainer(container: APIContainerComponent, disabledButtonIds: Set<string>): APIContainerComponent {
	return {
		...container,
		components: container.components.map((component) =>
			component.type === ComponentType.ActionRow ? disableTicketActionRow(component, disabledButtonIds) : component
		)
	};
}

function disableTicketActionRow<T extends APIComponentInMessageActionRow>(
	row: APIActionRowComponent<T>,
	disabledButtonIds: Set<string>
): APIActionRowComponent<T> {
	return {
		...row,
		components: row.components.map((component) =>
			isTicketActionButton(component, disabledButtonIds) ? (disableTicketActionButton(component) as T) : component
		) as T[]
	};
}

function disableTicketActionButton(button: APIButtonComponentWithCustomId): APIButtonComponentWithCustomId {
	return {
		...button,
		disabled: true
	};
}

function isTicketActionButton(
	component: APIComponentInMessageActionRow,
	disabledButtonIds: Set<string>
): component is APIButtonComponentWithCustomId {
	return component.type === ComponentType.Button && "custom_id" in component && disabledButtonIds.has(component.custom_id);
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

async function removeClosedTicketParticipantAccess(app: BotApp, channelId: string, openerId: string, invitedUserIds: string[]) {
	if (invitedUserIds.length === 0) {
		try {
			await revokeTicketParticipantAccess(app, channelId, openerId);
		} catch (error) {
			// Discord may return Unknown Overwrite if the opener left and the member overwrite is already gone.
			if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownPermissionOverwrite) {
				return;
			}

			throw error;
		}
		return;
	}

	const channel = await app.client.api.channels.get(channelId);

	if (!("permission_overwrites" in channel)) {
		return;
	}

	const removedUserIds = new Set([openerId, ...invitedUserIds]);
	const nextOverwrites: RESTAPIChannelPatchOverwrite[] = (channel.permission_overwrites ?? [])
		.filter((overwrite) => overwrite.type !== OverwriteType.Member || !removedUserIds.has(overwrite.id))
		.map((overwrite) => ({
			id: overwrite.id,
			type: overwrite.type,
			allow: overwrite.allow ?? "0",
			deny: overwrite.deny ?? "0"
		}));

	await app.client.api.channels.edit(channelId, {
		permission_overwrites: nextOverwrites
	});
}

function runCloseTaskInBackground(app: BotApp, channelId: string, action: string, task: () => Promise<void>) {
	void task().catch((error) => {
		app.logger.error(`Failed to ${action} for ticket channel ${channelId}.`, error);
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

	const messageTemplate = await loadMessageTemplate(app, resolveCloseDmMessageReference(app, ticketType), tokens);

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
	const messageTemplate = await loadMessageTemplate(app, resolveCloseChannelMessageReference(app, ticketType), {
		...tokens,
		deleteButtonCustomId
	});

	return finalizeMessageTemplate(
		appendMessageButton(
			messageTemplate,
			!hasMessageComponentCustomId(messageTemplate, deleteButtonCustomId)
				? ({
						type: ComponentType.Button,
						custom_id: deleteButtonCustomId,
						label: app.LL.tickets.actions.delete_ticket(),
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
	let displayedContent = "";
	let requestedContent = "";
	let flushPromise: Promise<void> | null = null;

	const flushLatestContent = async (): Promise<void> => {
		while (hasStarted && requestedContent !== displayedContent) {
			if (!flushPromise) {
				const nextContent = requestedContent;

				flushPromise = editReply(app, interaction, {
					content: nextContent
				})
					.catch(() => undefined)
					.then(() => {
						displayedContent = nextContent;
					})
					.finally(() => {
						flushPromise = null;
					});
			}

			await flushPromise;
		}
	};

	return {
		start: async (content: string) => {
			hasStarted = true;
			displayedContent = content;
			requestedContent = content;
			await reply(app, interaction, {
				content,
				flags: MessageFlags.Ephemeral
			});
		},
		update: async (content: string) => {
			if (!hasStarted || content === requestedContent) {
				return;
			}

			requestedContent = content;
			await flushLatestContent();
		}
	};
}

function readCloseReason(interaction: APIModalSubmitInteraction) {
	return getModalTextInputValues(interaction).get("reason")?.trim() || null;
}

function normalizeCloseReason(app: BotApp, reason: string | null) {
	return reason?.trim() || getDefaultNoReason(app);
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

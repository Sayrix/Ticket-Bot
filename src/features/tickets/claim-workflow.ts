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

import type { APIChatInputApplicationCommandInteraction, APIMessageComponentInteraction } from "@discordjs/core";
import { MessageFlags } from "@discordjs/core";
import { eq } from "drizzle-orm";
import { reply } from "@/core/respond";
import type { BotApp, CommandExecutionContext, ComponentExecutionContext } from "@/core/types";
import { ticketsTable } from "@/db/schema";
import { hasTicketStaffAccess } from "@/features/tickets/config-access";
import { getOpenTicketByChannel } from "@/features/tickets/records";
import { syncTicketWelcomeMessage } from "@/features/tickets/ticket-workflow";
import { getInteractionUser, getMemberRoleIds, renderChannelName } from "@/features/tickets/utils";

type ClaimInteraction = APIChatInputApplicationCommandInteraction | APIMessageComponentInteraction;

export async function executeClaimCommand(
	context: CommandExecutionContext,
	interaction: APIChatInputApplicationCommandInteraction
) {
	await claimTicket(context.app, interaction);
}

export async function executeUnclaimCommand(
	context: CommandExecutionContext,
	interaction: APIChatInputApplicationCommandInteraction
) {
	await unclaimTicket(context.app, interaction);
}

export async function handleClaimButton(context: ComponentExecutionContext, interaction: APIMessageComponentInteraction) {
	await claimTicket(context.app, interaction);
}

export async function handleUnclaimButton(context: ComponentExecutionContext, interaction: APIMessageComponentInteraction) {
	await unclaimTicket(context.app, interaction);
}

async function claimTicket(app: BotApp, interaction: ClaimInteraction) {
	if (!app.config.tickets.claims.enabled) {
		await replyWithContent(app, interaction, "Ticket claiming is disabled.");
		return;
	}

	const actor = getInteractionUser(interaction);
	const claimable = await getClaimableTicket(app, interaction.channel_id, getMemberRoleIds(interaction));

	if (!claimable.ok) {
		await replyWithContent(app, interaction, claimable.message);
		return;
	}

	const { ticket, ticketType } = claimable;

	if (ticket.claimedBy === actor.id) {
		await replyWithContent(app, interaction, "You already claimed this ticket.");
		return;
	}

	if (ticket.claimedBy && !canTakeOverClaim(app, getMemberRoleIds(interaction))) {
		await replyWithContent(app, interaction, "This ticket is already claimed and cannot be taken over.");
		return;
	}

	const claimedAt = Date.now();
	await app.db
		.update(ticketsTable)
		.set({
			claimedAt,
			claimedBy: actor.id
		})
		.where(eq(ticketsTable.channelId, ticket.channelId));

	const nextTicketState = {
		...ticket,
		claimedAt,
		claimedBy: actor.id
	};

	await updateClaimedTicketPresentation(app, nextTicketState, ticketType.name, actor.username);

	await syncTicketWelcomeMessage(app, nextTicketState, ticketType);

	await replyWithContent(
		app,
		interaction,
		ticket.claimedBy ? `Ticket reassigned to <@${actor.id}>.` : `You claimed this ticket.`
	);
}

async function unclaimTicket(app: BotApp, interaction: ClaimInteraction) {
	if (!app.config.tickets.claims.enabled) {
		await replyWithContent(app, interaction, "Ticket claiming is disabled.");
		return;
	}

	if (!app.config.tickets.claims.allowUnclaim) {
		await replyWithContent(app, interaction, "Unclaiming is disabled for this server.");
		return;
	}

	const actor = getInteractionUser(interaction);
	const claimable = await getClaimableTicket(app, interaction.channel_id, getMemberRoleIds(interaction));

	if (!claimable.ok) {
		await replyWithContent(app, interaction, claimable.message);
		return;
	}

	const { ticket, ticketType } = claimable;

	if (!ticket.claimedBy) {
		await replyWithContent(app, interaction, "This ticket is not claimed.");
		return;
	}

	if (ticket.claimedBy !== actor.id) {
		await replyWithContent(app, interaction, "Only the current claimer can unclaim this ticket.");
		return;
	}

	await app.db
		.update(ticketsTable)
		.set({
			claimedAt: null,
			claimedBy: null
		})
		.where(eq(ticketsTable.channelId, ticket.channelId));

	await syncTicketWelcomeMessage(
		app,
		{
			...ticket,
			claimedAt: null,
			claimedBy: null
		},
		ticketType
	);

	await replyWithContent(app, interaction, "You unclaimed this ticket.");
}

async function getClaimableTicket(app: BotApp, channelId: string | undefined, roleIds: string[]) {
	const openTicket = await getOpenTicketByChannel(app, channelId);

	if (!openTicket.ok) {
		return openTicket;
	}

	const { ticket, ticketType } = openTicket;

	if (!hasTicketStaffAccess(app, ticketType, roleIds)) {
		return {
			ok: false as const,
			message: "Only staff can claim this ticket."
		};
	}

	return {
		ok: true as const,
		ticket,
		ticketType
	};
}

function canTakeOverClaim(app: BotApp, roleIds: string[]) {
	switch (app.config.tickets.claims.takeoverMode) {
		case "staff":
			return true;
		case "roles": {
			const allowedRoleIds = new Set(app.config.tickets.claims.takeoverRoleIds ?? []);
			return roleIds.some((roleId) => allowedRoleIds.has(roleId));
		}
		default:
			return false;
	}
}

async function updateClaimedTicketPresentation(
	app: BotApp,
	ticket: {
		channelId: string;
		claimedBy: string | null;
		claimedAt: number | null;
		createdBy: string;
		id: number;
		type: string;
	},
	ticketTypeName: string,
	claimerUsername: string
) {
	await renameClaimedTicketChannel(app, ticket, ticketTypeName, claimerUsername);
	await moveClaimedTicketChannel(app, ticket.channelId);
}

async function renameClaimedTicketChannel(
	app: BotApp,
	ticket: {
		channelId: string;
		claimedBy: string | null;
		createdBy: string;
		id: number;
		type: string;
	},
	ticketTypeName: string,
	claimerUsername: string
) {
	const template = app.config.tickets.claims.nameWhenClaimed?.trim();

	if (!template || !ticket.claimedBy) {
		return;
	}

	const creator = await app.client.api.users.get(ticket.createdBy).catch(() => null);
	const nextName = renderChannelName(template, {
		claimerId: ticket.claimedBy,
		claimerUsername,
		createdById: ticket.createdBy,
		createdByUsername: creator?.username ?? ticket.createdBy,
		ticketNumber: ticket.id.toString(),
		ticketTypeKey: ticket.type,
		ticketTypeName
	});

	await app.client.api.channels.edit(ticket.channelId, {
		name: nextName
	});
}

async function moveClaimedTicketChannel(app: BotApp, channelId: string) {
	const categoryId = app.config.tickets.claims.categoryWhenClaimed?.trim();

	if (!categoryId) {
		return;
	}

	await app.client.api.channels.edit(channelId, {
		parent_id: categoryId
	});
}

async function replyWithContent(app: BotApp, interaction: ClaimInteraction, content: string) {
	await reply(app, interaction, {
		content,
		flags: MessageFlags.Ephemeral
	});
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

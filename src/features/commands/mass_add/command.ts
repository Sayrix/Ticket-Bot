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

import { MessageFlags } from "@discordjs/core";
import { ApplicationCommandOptionType } from "discord-api-types/v10";
import { defineCommand } from "@/core/defineCommand";
import { reply } from "@/core/respond";
import { getStringOption } from "@/features/commands/shared/options";
import { sendTicketLog } from "@/features/logs/service";
import { createTicketLogContext } from "@/features/logs/utils";
import {
	getInvitedUserIds,
	grantTicketParticipantAccess,
	MAX_INVITED_TICKET_USERS,
	updateInvitedUserIds
} from "@/features/tickets/participants";
import { getOpenTicketByChannel } from "@/features/tickets/records";
import { getInteractionUser } from "@/features/tickets/utils";

export default defineCommand({
	data: {
		name: "mass_add",
		description: "Add multiple users to the current ticket",
		options: [
			{
				name: "users",
				description: "Comma-separated user IDs or mentions",
				required: true,
				type: ApplicationCommandOptionType.String
			}
		]
	},
	async execute({ app }, interaction) {
		const rawValue = getStringOption(interaction, "users");
		const requestedUserIds = parseRequestedUserIds(rawValue ?? "");

		if (requestedUserIds.length === 0) {
			await reply(app, interaction, {
				content: "Provide at least one user ID or mention.",
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		const openTicket = await getOpenTicketByChannel(app, interaction.channel_id);

		if (!openTicket.ok) {
			await reply(app, interaction, {
				content: openTicket.message,
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		const invitedUserIds = getInvitedUserIds(openTicket.ticket);
		const nextInvitedUserIds = [...invitedUserIds];
		const addedUserIds: string[] = [];
		const invalidUserIds: string[] = [];
		const skippedUserIds: string[] = [];
		let limitReached = false;

		for (const userId of requestedUserIds) {
			if (userId === openTicket.ticket.createdBy || nextInvitedUserIds.includes(userId)) {
				skippedUserIds.push(userId);
				continue;
			}

			if (nextInvitedUserIds.length >= MAX_INVITED_TICKET_USERS) {
				limitReached = true;
				break;
			}

			const user = await app.client.api.users.get(userId).catch(() => null);

			if (!user) {
				invalidUserIds.push(userId);
				continue;
			}

			await grantTicketParticipantAccess(app, openTicket.ticket.channelId, userId);
			nextInvitedUserIds.push(userId);
			addedUserIds.push(userId);
		}

		if (addedUserIds.length > 0) {
			await updateInvitedUserIds(app, openTicket.ticket.channelId, nextInvitedUserIds);
			const actor = getInteractionUser(interaction);
			const ticketLogContext = createTicketLogContext(openTicket.ticket, openTicket.ticketType.name);

			for (const userId of addedUserIds) {
				void sendTicketLog(app, {
					kind: "userAdded",
					actor,
					targetId: userId,
					ticket: ticketLogContext
				});
			}
		}

		await reply(app, interaction, {
			content: buildMassAddSummary(addedUserIds, skippedUserIds, invalidUserIds, limitReached),
			flags: MessageFlags.Ephemeral
		});
	}
});

function parseRequestedUserIds(rawValue: string) {
	const segments = rawValue
		.split(",")
		.map((segment) => segment.trim())
		.filter(Boolean);

	const requestedUserIds: string[] = [];

	for (const segment of segments) {
		const mentionMatch = segment.match(/^<@!?(\d+)>$/);
		const userId = mentionMatch?.[1] ?? (/^\d+$/.test(segment) ? segment : null);

		if (userId) {
			requestedUserIds.push(userId);
		}
	}

	return [...new Set(requestedUserIds)];
}

function buildMassAddSummary(addedUserIds: string[], skippedUserIds: string[], invalidUserIds: string[], limitReached: boolean) {
	const lines: string[] = [];

	if (addedUserIds.length > 0) {
		lines.push(`Added ${addedUserIds.map((userId) => `<@${userId}>`).join(", ")}.`);
	} else {
		lines.push("No users were added.");
	}

	if (skippedUserIds.length > 0) {
		lines.push(`Skipped ${skippedUserIds.length} user(s) that already had access.`);
	}

	if (invalidUserIds.length > 0) {
		lines.push(`Skipped ${invalidUserIds.length} invalid user ID(s).`);
	}

	if (limitReached) {
		lines.push(`Stopped when the ${MAX_INVITED_TICKET_USERS}-user ticket limit was reached.`);
	}

	return lines.join("\n");
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

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

import { OverwriteType, PermissionFlagsBits } from "@discordjs/core";
import { eq } from "drizzle-orm";
import type { BotApp } from "@/core/types";
import type { TicketRecord } from "@/db/schema";
import { ticketsTable } from "@/db/schema";
import { TICKET_ACCESS_ALLOW } from "@/features/tickets/constants";

export const MAX_INVITED_TICKET_USERS = 25;

export function getInvitedUserIds(ticket: Pick<TicketRecord, "invitedUserIds">) {
	try {
		const parsed = JSON.parse(ticket.invitedUserIds);
		return normalizeInvitedUserIds(Array.isArray(parsed) ? parsed : []);
	} catch {
		return [];
	}
}

export function normalizeInvitedUserIds(userIds: string[]) {
	return [...new Set(userIds.map((userId) => userId.trim()).filter(Boolean))];
}

export async function updateInvitedUserIds(app: BotApp, channelId: string, userIds: string[]) {
	await app.db
		.update(ticketsTable)
		.set({
			invitedUserIds: JSON.stringify(normalizeInvitedUserIds(userIds))
		})
		.where(eq(ticketsTable.channelId, channelId));
}

export async function grantTicketParticipantAccess(app: BotApp, channelId: string, userId: string) {
	await app.client.api.channels.editPermissionOverwrite(channelId, userId, {
		type: OverwriteType.Member,
		allow: TICKET_ACCESS_ALLOW.toString(),
		deny: "0"
	});
}

export async function revokeTicketParticipantAccess(app: BotApp, channelId: string, userId: string) {
	await app.client.api.channels.editPermissionOverwrite(channelId, userId, {
		type: OverwriteType.Member,
		allow: "0",
		deny: PermissionFlagsBits.ViewChannel.toString()
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

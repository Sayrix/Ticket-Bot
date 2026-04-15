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

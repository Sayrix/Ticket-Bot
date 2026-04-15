import { eq } from "drizzle-orm";
import type { BotApp } from "@/core/types";
import { type TicketRecord, ticketsTable } from "@/db/schema";
import { getTicketType } from "@/features/tickets/config-access";

export async function findTicketByChannel(app: BotApp, channelId: string) {
	return app.db
		.select()
		.from(ticketsTable)
		.where(eq(ticketsTable.channelId, channelId))
		.limit(1)
		.then((rows) => rows[0] as TicketRecord | undefined);
}

export async function getOpenTicketByChannel(app: BotApp, channelId: string | undefined) {
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
			message: "This channel is not an open ticket."
		};
	}

	if (ticket.closedAt) {
		return {
			ok: false as const,
			message: "This ticket is already closed."
		};
	}

	return {
		ok: true as const,
		ticket,
		ticketType: getTicketType(app, ticket.type)
	};
}

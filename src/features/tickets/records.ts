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
			message: app.LL.tickets.records.not_ticket_channel()
		};
	}

	const ticket = await findTicketByChannel(app, channelId);

	if (!ticket) {
		return {
			ok: false as const,
			message: app.LL.tickets.records.not_open_ticket()
		};
	}

	if (ticket.closedAt) {
		return {
			ok: false as const,
			message: app.LL.tickets.records.already_closed()
		};
	}

	return {
		ok: true as const,
		ticket,
		ticketType: getTicketType(app, ticket.type)
	};
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

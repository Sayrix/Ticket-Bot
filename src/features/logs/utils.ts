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

import type { TicketRecord } from "@/db/schema";
import type { TicketLogTicketContext } from "@/features/logs/types";

export function createTicketLogContext(
	ticket: Pick<TicketRecord, "id" | "channelId" | "type" | "createdAt" | "createdBy" | "claimedBy">,
	ticketTypeName: string
): TicketLogTicketContext {
	return {
		ticketId: ticket.id.toString(),
		ticketChannelId: ticket.channelId,
		ticketTypeKey: ticket.type,
		ticketTypeName,
		createdAt: ticket.createdAt,
		createdById: ticket.createdBy,
		claimedById: ticket.claimedBy
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

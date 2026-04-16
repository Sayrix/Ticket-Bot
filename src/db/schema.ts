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

import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// NOTE: Columns that does not have notNull constraint ARE nullable.

export const panelMessagesTable = sqliteTable("panel_messages", {
	panelKey: text().primaryKey(),
	channelId: text().notNull(),
	messageId: text().notNull(),
	updatedAt: int().notNull()
});

export const ticketsTable = sqliteTable("tickets", {
	id: int().primaryKey({ autoIncrement: true }),
	/** The ID of the channel where the ticket was created. */
	channelId: text().unique().notNull(),
	/** The ID of the message the bot sent when creating the ticket. */
	creationMessageId: text().unique().notNull(),
	/** The type of the ticket (ticketType in config). */
	type: text().notNull(),
	/** The reason for the ticket, inputted by the user. */
	reason: text(),
	/** The user who created the ticket. */
	createdBy: text().notNull(),
	/** UNIX time */
	createdAt: int().notNull(),
	/** UNIX time */
	claimedAt: int(),
	claimedBy: text(),
	invitedUserIds: text().notNull().default("[]"),
	/** UNIX time */
	closedAt: int(),
	closedBy: text(),
	closedReason: text(),
	transcriptUrl: text()
});

export type TicketRecord = typeof ticketsTable.$inferSelect;

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

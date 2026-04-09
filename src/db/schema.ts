import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// NOTE: Columns that does not have notNull constraint ARE nullable.

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
	/** UNIX time */
	closedAt: int(),
	closedBy: text(),
	closedReason: text(),
	transcriptUrl: text()
});

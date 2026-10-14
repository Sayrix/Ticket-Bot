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

import type { APIChatInputApplicationCommandInteraction } from "@discordjs/core";
import { PermissionFlagsBits } from "@discordjs/core";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import type { BotApp } from "@/core/types";
import { ticketBansTable } from "@/db/schema";

type BanApp = Pick<BotApp, "db" | "config">;

const DURATION_UNITS = new Map([
	["s", 1_000],
	["m", 60_000],
	["h", 3_600_000],
	["d", 86_400_000],
	["w", 604_800_000]
]);

/** Parse explicit units so a bare number cannot accidentally become a lifetime ban. */
export function parseTicketBanDuration(input: string | null, now = Date.now()) {
	if (input === null || /^(lifetime|permanent)$/i.test(input.trim())) {
		return { ok: true, expiresAt: null } as const;
	}

	const normalized = input.trim().toLowerCase();
	const parts = normalized.matchAll(/(\d+)\s*([smhdw])/g);
	let consumed = "";
	let duration = 0;

	for (const part of parts) {
		const multiplier = DURATION_UNITS.get(part[2]);
		if (!multiplier) {
			return { ok: false } as const;
		}
		consumed += part[0].replace(/\s/g, "");
		duration += Number(part[1]) * multiplier;
	}

	const expiresAt = now + duration;
	if (
		consumed !== normalized.replace(/\s/g, "") ||
		duration <= 0 ||
		!Number.isSafeInteger(expiresAt) ||
		expiresAt > 8_640_000_000_000_000
	) {
		return { ok: false } as const;
	}

	return { ok: true, expiresAt } as const;
}

/** Enforce moderation permissions even if Discord command permissions are overridden. */
export function canManageTicketBans(app: Pick<BotApp, "config">, interaction: APIChatInputApplicationCommandInteraction) {
	if (interaction.guild_id !== app.config.guildId || !interaction.member) {
		return false;
	}
	const permissions = BigInt(interaction.member.permissions);
	return (permissions & (PermissionFlagsBits.BanMembers | PermissionFlagsBits.Administrator)) !== 0n;
}

/** Expiry is checked on reads, so bans expire even while the bot is offline. */
export async function getActiveTicketBan(app: BanApp, userId: string, now = Date.now()) {
	const rows = await app.db
		.select()
		.from(ticketBansTable)
		.where(
			and(
				eq(ticketBansTable.guildId, app.config.guildId),
				eq(ticketBansTable.userId, userId),
				or(isNull(ticketBansTable.expiresAt), gt(ticketBansTable.expiresAt, now))
			)
		)
		.limit(1);
	return rows[0] ?? null;
}

/** Reissuing the command replaces the existing ban and its expiry atomically. */
export async function setTicketBan(app: BanApp, userId: string, bannedBy: string, expiresAt: number | null) {
	const values = { guildId: app.config.guildId, userId, bannedBy, createdAt: Date.now(), expiresAt };
	await app.db
		.insert(ticketBansTable)
		.values(values)
		.onConflictDoUpdate({ target: [ticketBansTable.guildId, ticketBansTable.userId], set: values });
}

export async function removeTicketBan(app: BanApp, userId: string) {
	const rows = await app.db
		.delete(ticketBansTable)
		.where(and(eq(ticketBansTable.guildId, app.config.guildId), eq(ticketBansTable.userId, userId)))
		.returning();
	const ban = rows[0];
	return Boolean(ban && (ban.expiresAt === null || ban.expiresAt > Date.now()));
}

export async function getTicketBanMessage(app: Pick<BotApp, "db" | "config" | "LL">, userId: string) {
	const ban = await getActiveTicketBan(app, userId);
	if (!ban) {
		return null;
	}
	return ban.expiresAt === null
		? app.LL.tickets.open.banned_lifetime()
		: app.LL.tickets.open.banned_until({ timestamp: Math.ceil(ban.expiresAt / 1_000) });
}

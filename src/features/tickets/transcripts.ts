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

import { TicketPmUploadClient } from "@ticketpm/core";
import { buildEnrichedDiscordApiTranscriptData } from "@ticketpm/discord-api";
import { eq } from "drizzle-orm";
import type { BotApp } from "@/core/types";
import { ticketsTable } from "@/db/schema";

const TRANSCRIPT_BASE_URL = "https://api.ticket.pm/v2";
const TRANSCRIPT_VIEW_BASE_URL = "https://ticket.pm/";
const TRANSCRIPT_TIMEOUT_MS = 15 * 60 * 1000;

type TranscriptStatusHandler = (content: string) => Promise<void> | void;
type TranscriptSourceMessage = Parameters<typeof buildEnrichedDiscordApiTranscriptData>[0]["messages"][number];

export async function startTranscriptJob(
	app: BotApp,
	ticketChannelId: string,
	options?: {
		onStatus?: TranscriptStatusHandler;
	}
) {
	const promise = createTranscript(app, ticketChannelId, options?.onStatus)
		.then(async (transcriptUrl) => {
			if (transcriptUrl) {
				await app.db.update(ticketsTable).set({ transcriptUrl }).where(eq(ticketsTable.channelId, ticketChannelId));
			}

			return transcriptUrl;
		})
		.catch((error) => {
			app.logger.warn(`Failed to create transcript for ticket channel ${ticketChannelId}.`, error);
			return null;
		});

	return {
		promise,
		// Do not let transcript upload block the rest of the close flow forever.
		// If ticket.pm has not finished within 15 minutes, closing continues.
		waitForResult: () => waitWithTimeout(promise, TRANSCRIPT_TIMEOUT_MS)
	};
}

async function createTranscript(app: BotApp, channelId: string, onStatus?: TranscriptStatusHandler) {
	await reportStatus(onStatus, "Collecting ticket messages...");

	const [channel, guild, messages] = await Promise.all([
		app.client.api.channels.get(channelId),
		app.client.api.guilds.get(app.config.guildId).catch(() => null),
		fetchAllMessages(app, channelId)
	]);

	await reportStatus(onStatus, "Creating transcript...");

	const draftTranscript = await buildEnrichedDiscordApiTranscriptData({
		messages,
		channelId,
		guildId: app.config.guildId,
		guild: guild
			? {
					id: guild.id,
					name: guild.name,
					icon: guild.icon,
					approximate_member_count: guild.approximate_member_count ?? undefined,
					owner_id: guild.owner_id,
					vanity_url_code: guild.vanity_url_code ?? null
				}
			: undefined,
		enricher: {
			fetchUser: async (userId) => await app.client.api.users.get(userId).catch(() => null),
			fetchChannel: async (targetChannelId) => {
				const targetChannel = await app.client.api.channels.get(targetChannelId).catch(() => null);

				if (!targetChannel) {
					return null;
				}

				return {
					id: targetChannel.id,
					type: targetChannel.type,
					name: "name" in targetChannel && typeof targetChannel.name === "string" ? targetChannel.name : undefined,
					parent_id:
						"parent_id" in targetChannel && typeof targetChannel.parent_id === "string" ? targetChannel.parent_id : undefined
				};
			},
			fetchGuildMember: async (guildId, userId) => await app.client.api.guilds.getMember(guildId, userId).catch(() => null),
			fetchGuildRoles: async (guildId) => await app.client.api.guilds.getRoles(guildId).catch(() => []),
			fetchPollAnswerVoters: async ({ channelId: pollChannelId, messageId, answerId }) => {
				const result = await app.client.api.poll.getAnswerVoters(pollChannelId, messageId, answerId).catch(() => null);

				if (!result || !("users" in result) || !Array.isArray(result.users)) {
					return [];
				}

				return result.users;
			}
		},
		baseContext: {
			channel_id: channelId,
			channels: {
				[channelId]: {
					name: "name" in channel && typeof channel.name === "string" ? channel.name : channelId
				}
			}
		}
	});

	await reportStatus(onStatus, "Uploading transcript...");

	const uploadClient = new TicketPmUploadClient({
		baseUrl: TRANSCRIPT_BASE_URL,
		token: process.env.TICKETPM_PASSKEY
	});
	const result = await uploadClient.uploadDraftTranscript(draftTranscript, {
		uuidStyleIds: app.config.uuidType !== "emoji",
		avatarProgress: createProgressHandler("Uploading avatars...", onStatus),
		mediaProgress: createProgressHandler("Uploading attachments...", onStatus)
	});

	return `${TRANSCRIPT_VIEW_BASE_URL}${result.id}`;
}

async function fetchAllMessages(app: BotApp, channelId: string) {
	const messages: TranscriptSourceMessage[] = [];
	let before: string | undefined;

	while (true) {
		const batch = await app.client.api.channels.getMessages(channelId, {
			limit: 100,
			before
		});

		if (batch.length === 0) {
			break;
		}

		// discord.js/core and @ticketpm/discord-api may resolve different
		// discord-api-types package instances, so keep the cast local here.
		messages.push(...(batch as TranscriptSourceMessage[]));

		if (batch.length < 100) {
			break;
		}

		before = batch[batch.length - 1]?.id;
	}

	// Discord returns channel history newest-first. Reverse it once so the
	// transcript is generated in the same chronological order users saw it.
	return messages.reverse();
}

function createProgressHandler(label: string, onStatus?: TranscriptStatusHandler) {
	let lastBucket = -1;

	return (completed: number, total: number) => {
		if (!onStatus || total <= 0) {
			return;
		}

		const bucket = total <= 10 ? completed : Math.floor((completed / total) * 10);

		if (completed !== total && bucket === lastBucket) {
			return;
		}

		lastBucket = bucket;
		void onStatus(`${label} (${completed}/${total})`);
	};
}

async function reportStatus(onStatus: TranscriptStatusHandler | undefined, content: string) {
	if (!onStatus) {
		return;
	}

	await onStatus(content);
}

async function waitWithTimeout<TValue>(promise: Promise<TValue>, timeoutMs: number) {
	return await Promise.race<TValue | null>([
		promise,
		new Promise<null>((resolve) => {
			setTimeout(() => resolve(null), timeoutMs);
		})
	]);
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

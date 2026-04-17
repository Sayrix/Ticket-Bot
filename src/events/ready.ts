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

import { GatewayDispatchEvents, type GatewayReadyDispatchData, type ToEventProps } from "@discordjs/core";
import {
	ActivityType,
	ChannelType,
	type GatewayPresenceUpdateData,
	PermissionFlagsBits,
	PresenceUpdateStatus
} from "discord-api-types/v10";
import { defineEvent } from "@/core/defineEvent";
import type { BotApp } from "@/core/types";
import { deployApplicationCommands } from "@/deploy-commands";
import { syncTicketPanels } from "@/features/tickets/service";

const PRESENCE_REFRESH_INTERVAL_MS = 900_000;
const SPONSORS_URL = "https://raw.githubusercontent.com/Sayrix/sponsors/main/sponsors.json";
const PANEL_CHANNEL_TYPES = new Set([
	ChannelType.GuildAnnouncement,
	ChannelType.GuildStageVoice,
	ChannelType.GuildText,
	ChannelType.GuildVoice,
	ChannelType.AnnouncementThread,
	ChannelType.PrivateThread,
	ChannelType.PublicThread
]);
const ACTIVITY_TYPES = {
	COMPETING: ActivityType.Competing,
	CUSTOM: ActivityType.Custom,
	LISTENING: ActivityType.Listening,
	PLAYING: ActivityType.Playing,
	STREAMING: ActivityType.Streaming,
	WATCHING: ActivityType.Watching
} as const;
const PRESENCE_STATUSES = {
	dnd: PresenceUpdateStatus.DoNotDisturb,
	idle: PresenceUpdateStatus.Idle,
	invisible: PresenceUpdateStatus.Invisible,
	online: PresenceUpdateStatus.Online
} as const;

const readyEvent = defineEvent<[ToEventProps<GatewayReadyDispatchData>]>({
	name: GatewayDispatchEvents.Ready,
	once: true,
	async execute(app, event) {
		await validateStartupEnvironment(app, event.data.user.id);
		app.logger.info(`Connected as ${event.data.user.username}.`);

		await deployApplicationCommands({
			applicationCommands: app.registry.applicationCommands,
			clientId: app.config.clientId,
			guildId: app.config.guildId,
			logger: app.logger,
			token: process.env.DISCORD_TOKEN
		});
		await syncTicketPanels(app);
		await applyConfiguredPresence(app);
		setInterval(() => {
			void applyConfiguredPresence(app);
		}, PRESENCE_REFRESH_INTERVAL_MS);
		await announceStartup(app, `${event.data.user.username}#${event.data.user.discriminator}`, event.data.user.id);
	}
});

export default readyEvent;

async function validateStartupEnvironment(app: BotApp, currentUserId: string) {
	const guildId = app.config.guildId.trim();

	if (!guildId) {
		await failStartup(app, 'Please set "guildId" in config/config.ts before starting the bot.');
	}

	await app.client.api.guilds
		.get(guildId)
		.catch((error) => failStartup(app, `Configured guild "${guildId}" was not found or is not accessible.`, error));

	const member = await app.client.api.guilds
		.getMember(guildId, currentUserId)
		.catch((error) => failStartup(app, `Bot user "${currentUserId}" is not a member of guild "${guildId}".`, error));

	const roles = await app.client.api.guilds
		.getRoles(guildId)
		.catch((error) => failStartup(app, `Failed to fetch roles for guild "${guildId}".`, error));
	const memberRoleIds = new Set([guildId, ...member.roles]);
	const permissions = roles.reduce((bits, role) => {
		if (!memberRoleIds.has(role.id)) {
			return bits;
		}

		return bits | BigInt(role.permissions);
	}, 0n);

	if ((permissions & PermissionFlagsBits.Administrator) !== PermissionFlagsBits.Administrator) {
		warnStartup(app, "The bot does not have the Administrator permission. Some actions may fail because of missing permissions.");
	}

	for (const [panelKey, panel] of Object.entries(app.config.panels)) {
		const channelId = panel.channelId.trim();

		if (!channelId) {
			await failStartup(app, `Panel "${panelKey}" is missing its channelId.`);
		}

		const channel = await app.client.api.channels
			.get(channelId)
			.catch((error) => failStartup(app, `Panel "${panelKey}" channel "${channelId}" was not found.`, error));

		if (!PANEL_CHANNEL_TYPES.has(channel.type)) {
			await failStartup(app, `Panel "${panelKey}" channel "${channelId}" is not a text-based channel.`);
		}
	}
}

async function failStartup(app: BotApp, message: string, error?: unknown): Promise<never> {
	if (error) {
		app.logger.error(message, error);
	} else {
		app.logger.error(message);
	}

	process.exit(1);
}

function warnStartup(app: BotApp, message: string, error?: unknown) {
	if (error) {
		app.logger.warn(message, error);
		return;
	}

	app.logger.warn(message);
}

async function announceStartup(app: BotApp, tag: string, userId: string) {
	app.logger.info(`🚀 The bot is ready! Logged in as ${tag} (${userId}).`);
	app.logger.info("⭐ Help the project by leaving a star on GitHub: \x1b[36;1mhttps://github.com/Sayrix/Ticket-Bot\x1b[0m");
	app.logger.info(
		"⛅ Need to host your Ticket-Bot? Support the project and get access to hosting for $1/month: \x1b[36;1mhttps://github.com/sponsors/Sayrix\x1b[0m"
	);

	const sponsorLogins = await fetchSponsors();

	if (sponsorLogins.length === 0) {
		return;
	}

	const sponsorNames = sponsorLogins.map(
		(login) => `\x1b]8;;https://github.com/${login}\x1b\\\x1b[1m${login}\x1b]8;;\x1b\\\x1b[0m`
	);
	app.logger.info(`💖 Thanks to our sponsors: ${sponsorNames.join(", ")} who make this project possible!`);
}

async function fetchSponsors() {
	try {
		const response = (await fetch(SPONSORS_URL)) as any;

		if (!response.ok) {
			return [];
		}

		const payload = (await response.json()) as Array<{
			sponsor?: {
				login?: string;
			};
		}>;

		return payload.flatMap((entry) => (typeof entry.sponsor?.login === "string" ? [entry.sponsor.login] : []));
	} catch {
		return [];
	}
}

async function applyConfiguredPresence(app: BotApp) {
	const configuredStatus = app.config.status;

	if (!configuredStatus?.enabled) {
		return;
	}

	const activities =
		configuredStatus.type && configuredStatus.text
			? [
					{
						name: configuredStatus.text,
						type: ACTIVITY_TYPES[configuredStatus.type],
						url: configuredStatus.type === "STREAMING" && configuredStatus.url?.trim() ? configuredStatus.url : undefined
					}
				]
			: [];
	const presence: GatewayPresenceUpdateData = {
		activities,
		afk: false,
		since: null,
		status: PRESENCE_STATUSES[configuredStatus.status]
	};
	const shardCount = await app.client.gateway.getShardCount();

	for (let shardId = 0; shardId < shardCount; shardId += 1) {
		await app.client.updatePresence(shardId, presence);
	}
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

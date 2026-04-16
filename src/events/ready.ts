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
import { ActivityType, type GatewayPresenceUpdateData, PresenceUpdateStatus } from "discord-api-types/v10";
import { defineEvent } from "@/core/defineEvent";
import type { BotApp } from "@/core/types";
import { deployApplicationCommands } from "@/deploy-commands";
import { syncTicketPanels } from "@/features/tickets/service";

const PRESENCE_REFRESH_INTERVAL_MS = 900_000;
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
	}
});

export default readyEvent;

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

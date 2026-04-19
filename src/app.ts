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

import { Client, GatewayIntentBits } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import { drizzle } from "drizzle-orm/libsql";
import { discoverCommands, discoverEvents, discoverFeatures } from "@/core/discovery";
import { createBotI18n } from "@/core/i18n";
import { createLogger } from "@/core/logger";
import { createHandlerRegistry, registerEvents } from "@/core/registry";
import { InteractionRouter } from "@/core/router";
import type { BotApp } from "@/core/types";
import botConfig from "../config/config.ts";

export async function createBotApp() {
	const logger = createLogger("bot");
	const db = drizzle(process.env.DB_FILE_NAME);

	const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
	const gateway = new WebSocketManager({
		token: process.env.DISCORD_TOKEN,
		intents: GatewayIntentBits.Guilds,
		rest
	});

	const client = new Client({ rest, gateway: gateway as never });
	const [commands, events, features] = await Promise.all([
		discoverCommands(logger),
		discoverEvents(logger),
		discoverFeatures(logger)
	]);
	const i18n = createBotI18n(botConfig.lang, logger);
	const registry = createHandlerRegistry({ commands, features, events, logger, LL: i18n.LL });

	const app = {} as BotApp;
	app.client = client;
	app.db = db;
	app.config = botConfig;
	app.logger = logger;
	app.applicationId = botConfig.clientId;
	app.locale = i18n.locale;
	app.LL = i18n.LL;
	app.registry = registry;

	app.router = new InteractionRouter(app);

	registerEvents(app);

	rest.on("rateLimited", (info: unknown) => {
		logger.warn("Discord REST rate limit", info);
	});

	return {
		app,
		async start() {
			logger.info(`Loaded ${registry.features.size} features and ${registry.commands.size} slash commands.`);
			await gateway.connect();
		},
		async stop() {
			try {
				await gateway.destroy();
			} catch (error) {
				logger.warn("Failed to destroy gateway cleanly", error);
			}
		}
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

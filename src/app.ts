import { Client, GatewayIntentBits } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import { drizzle } from "drizzle-orm/libsql";
import { discoverCommands, discoverEvents, discoverFeatures } from "@/core/discovery";
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
	const registry = createHandlerRegistry({ commands, features, events, logger });

	const app = {} as BotApp;
	app.client = client;
	app.db = db;
	app.config = botConfig;
	app.logger = logger;
	app.applicationId = botConfig.clientId;
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

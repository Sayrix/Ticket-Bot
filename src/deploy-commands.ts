import { API } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";
import { config } from "dotenv";
import { discoverCommands, discoverEvents, discoverFeatures } from "@/core/discovery";
import { createLogger, type Logger } from "@/core/logger";
import { createHandlerRegistry } from "@/core/registry";
import botConfig from "../config/config.ts";

config({ path: "./config/.env", quiet: true });
const logger = createLogger("deploy");

export async function deployApplicationCommands(options: {
	applicationCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[];
	clientId: string;
	guildId?: string;
	logger: Logger;
	token: string;
}) {
	const rest = new REST({ version: "10" }).setToken(options.token);
	const api = new API(rest);

	if (options.guildId) {
		await api.applicationCommands.bulkOverwriteGuildCommands(options.clientId, options.guildId, options.applicationCommands);

		options.logger.info(`Deployed ${options.applicationCommands.length} guild commands to ${options.guildId}.`);
		return;
	}

	await api.applicationCommands.bulkOverwriteGlobalCommands(options.clientId, options.applicationCommands);

	options.logger.info(`Deployed ${options.applicationCommands.length} global commands.`);
}

async function deployCommands() {
	const [commands, events, features] = await Promise.all([
		discoverCommands(logger),
		discoverEvents(logger),
		discoverFeatures(logger)
	]);
	const registry = createHandlerRegistry({ commands, features, events, logger });

	await deployApplicationCommands({
		applicationCommands: registry.applicationCommands,
		clientId: botConfig.clientId,
		guildId: botConfig.guildId,
		logger,
		token: process.env.DISCORD_TOKEN
	});
}

if (import.meta.main) {
	deployCommands().catch((error) => {
		logger.error("Failed to deploy commands", error);
		process.exit(1);
	});
}

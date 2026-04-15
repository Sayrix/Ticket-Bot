import { API } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { config } from "dotenv";
import { discoverCommands, discoverEvents, discoverFeatures } from "@/core/discovery";
import { createLogger } from "@/core/logger";
import { createHandlerRegistry } from "@/core/registry";
import botConfig from "../config/config.ts";

config({ path: "./config/.env" });
const logger = createLogger("deploy");
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
const api = new API(rest);

async function deployCommands() {
	const [commands, events, features] = await Promise.all([
		discoverCommands(logger),
		discoverEvents(logger),
		discoverFeatures(logger)
	]);
	const registry = createHandlerRegistry({ commands, features, events, logger });

	if (botConfig.guildId) {
		await api.applicationCommands.bulkOverwriteGuildCommands(botConfig.clientId, botConfig.guildId, registry.applicationCommands);

		logger.info(`Deployed ${registry.applicationCommands.length} guild commands to ${botConfig.guildId}.`);
		return;
	}

	await api.applicationCommands.bulkOverwriteGlobalCommands(botConfig.clientId, registry.applicationCommands);

	logger.info(`Deployed ${registry.applicationCommands.length} global commands.`);
}

deployCommands().catch((error) => {
	logger.error("Failed to deploy commands", error);
	process.exit(1);
});

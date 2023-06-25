import fs from "node:fs";
import path from "node:path";
import { jsonc } from "jsonc";
import { REST } from "@discordjs/rest";
import { Routes } from "discord.js";
import { DiscordClient } from "./Types";

export default {
	/**
	 * @param {Discord.Client} client
	 */
	async deployCommands(client: DiscordClient) {
		const commands = [];
		const commandsPath = path.join(__dirname, "commands");
		const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

		const { guildId } = jsonc.parse(fs.readFileSync(path.join(__dirname, "../config/config.jsonc"), "utf8"));

		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const command = require(filePath).default;
			commands.push(command.data.toJSON());
		}
		if(!process.env["TOKEN"]) throw Error("Discord Token Expected, deploy-command");
		const rest = new REST({ version: "10" }).setToken(process.env["TOKEN"]);

		rest
			.put(Routes.applicationGuildCommands(client.user?.id ?? "", guildId), { body: commands })
			.then(() => console.log("✅  Successfully registered application commands."))
			.catch(console.error);
	},
};

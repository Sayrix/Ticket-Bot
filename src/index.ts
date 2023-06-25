/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { Interaction } from "discord.js";
import fs from "fs-extra";
import path from "node:path";
import { Client, Collection, GatewayIntentBits } from "discord.js";
import { jsonc } from "jsonc";
import { DiscordClient, config, locale } from "./Types";
import { config as envconf } from "dotenv";
import { PrismaClient } from "@prisma/client";

// Initalize .env file as environment
try {envconf();}
catch(ex) {console.log(".env failed to load");}

// Although invalid type, it should be good enough for now until more stuff needs to be handled here
process.on("unhandledRejection", (reason: string, promise: string, a: string) => {
	console.log(reason, promise, a);
});

process.stdout.write(`
\x1b[38;2;143;110;250m████████╗██╗ ██████╗██╗  ██╗███████╗████████╗    ██████╗  ██████╗ ████████╗
\x1b[38;2;157;101;254m╚══██╔══╝██║██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝    ██╔══██╗██╔═══██╗╚══██╔══╝
\x1b[38;2;172;90;255m   ██║   ██║██║     █████╔╝ █████╗     ██║       ██████╔╝██║   ██║   ██║   
\x1b[38;2;188;76;255m   ██║   ██║██║     ██╔═██╗ ██╔══╝     ██║       ██╔══██╗██║   ██║   ██║   
\x1b[38;2;205;54;255m   ██║   ██║╚██████╗██║  ██╗███████╗   ██║       ██████╔╝╚██████╔╝   ██║   
\x1b[38;2;222;0;255m   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝       ╚═════╝  ╚═════╝    ╚═╝\x1b[0m
                 https://github.com/Sayrix/ticket-bot

Connecting to Discord...
`);

// Update Detector
fetch("https://api.github.com/repos/Sayrix/Ticket-Bot/tags").then((res) => {
	if (Math.floor(res.status / 100) !== 2) return console.warn("🔄  Failed to pull latest version from server");
	res.json().then((json) => {
		// Assumign the format stays consistent (i.e. x.x.x)
		const latest = json[0].name.split(".").map((k: string) => parseInt(k));
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const current = require("../package.json").version.split(".")
			.map((k: string) => parseInt(k));
		if (
			latest[0] > current[0] ||
			(latest[0] === current[0] && latest[1] > current[1]) ||
			(latest[0] === current[0] && latest[1] === current[1] && latest[2] > current[2])
		)
			console.warn(`🔄  New version available: ${json[0].name}; Current Version: ${current.join(".")}`);
		else console.log("🔄  The ticket-bot is up to date");
	});
});


const config: config = jsonc.parse(fs.readFileSync(path.join(__dirname, "/../config/config.jsonc"), "utf8"));

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
	presence: {
		status: config.status?.status ?? "online"
	}
}) as DiscordClient;

// All variables stored in the client object
client.config = config;
client.prisma = new PrismaClient();

// eslint-disable-next-line @typescript-eslint/no-var-requires
client.locales = require(`../locales/${client.config.lang}.json`) as locale;
client.msToHm = function dhm(ms: number | Date) {
	if(ms instanceof Date) ms = ms.getTime();
	
	const days = Math.floor(ms / (24 * 60 * 60 * 1000));
	const daysms = ms % (24 * 60 * 60 * 1000);
	const hours = Math.floor(daysms / (60 * 60 * 1000));
	const hoursms = ms % (60 * 60 * 1000);
	const minutes = Math.floor(hoursms / (60 * 1000));
	const minutesms = ms % (60 * 1000);
	const sec = Math.floor(minutesms / 1000);

	if (days > 0) return `${days}d ${hours}h ${minutes}m ${sec}s`;
	if (hours > 0) return `${hours}h ${minutes}m ${sec}s`;
	if (minutes > 0) return `${minutes}m ${sec}s`;
	if (sec > 0) return `${sec}s`;
	return "0s";
};

// Command handler
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const command = require(filePath).default;
	client.commands.set(command.data.name, command);
}

// Execute commands
client.on("interactionCreate", async (interaction: Interaction) => {
	if (!interaction.isChatInputCommand()) return;
	const command = client.commands.get(interaction.commandName);
	if (!command) return;

	try {
		await command.execute(interaction, client);
	} catch (error) {
		console.error(error);
		await interaction.reply({
			content: "There was an error while executing this command!",
			ephemeral: true
		});
	}
});

// Event handler
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const event = require(filePath).default;
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args, client));
	}
}

// Login the bot
client.login(process.env["TOKEN"]);

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

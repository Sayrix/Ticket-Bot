/* eslint-disable no-unused-vars */
import readline from "readline";
import axios from "axios";
import {client as WebSocketClient, connection} from "websocket";
import { DiscordClient, SayrixSponsorData } from "../Types";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import {version} from "../../package.json";
import os from "os";
import deployCmd from "../deploy-commands";

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

export default {
	name: "ready",
	once: true,
	/**
	 * @param {Discord.Client} client
	 */
	async execute(client: DiscordClient) {
		if (!client.config.guildId) {
			console.log("⚠️⚠️⚠️ Please add the guild id in the config.jsonc file. ⚠️⚠️⚠️");
			process.exit(0);
		}

		await client.guilds.fetch(client.config.guildId);
		await client.guilds.cache.get(client.config.guildId)?.members.fetch();
		if (!client.guilds.cache.get(client.config.guildId)?.members.me?.permissions.has("Administrator")) {
			console.log("\n⚠️⚠️⚠️ I don't have the Administrator permission, to prevent any issues please add the Administrator permission to me. ⚠️⚠️⚠️");
			process.exit(0);
		}

		const embedMessageId = await client.db.get("temp.openTicketMessageId");
		await client.channels.fetch(client.config.openTicketChannelId).catch(() => {
			console.error("The channel to open tickets is not found!");
			process.exit(0);
		});
		const openTicketChannel = await client.channels.cache.get(client.config.openTicketChannelId);
		if (!openTicketChannel) {
			console.error("The channel to open tickets is not found!");
			process.exit(0);
		}

		if (!openTicketChannel.isTextBased()) {
			console.error("The channel to open tickets is not a channel!");
			process.exit(0);
		}

		const embed = client.locales.embeds.openTicket;

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

		embed.color = parseInt(client.config.mainColor, 16);
		// Please respect the project by keeping the credits, (if it is too disturbing you can credit me in the "about me" of the bot discord)
		embed.footer.text = "ticket.pm" + embed.footer.text.replace("ticket.pm", ""); // Please respect the LICENSE :D
		// Please respect the project by keeping the credits, (if it is too disturbing you can credit me in the "about me" of the bot discord)

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

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setCustomId("openTicket").setLabel(client.locales.other.openTicketButtonMSG).setStyle(ButtonStyle.Primary)
		);

		try {
			const msg = await openTicketChannel?.messages?.fetch(embedMessageId).catch((ex) => console.error(ex));
			if (msg && msg.id) {
				msg.edit({
					embeds: [embed],
					components: [row]
				});
			} else {
				const channel = client.channels.cache.get(client.config.openTicketChannelId);
				if(!channel || !channel.isTextBased()) return console.error("Invalid openTicketChannelId");
				channel.send({
					embeds: [embed],
					components: [row]
				}).then((rMsg) => {
					client.db.set("temp.openTicketMessageId", rMsg.id);
				});
			}
		} catch (e) {
			console.error(e);
		}

		function setStatus() {
			if (client.config.status) {
				if (!client.config.status.enabled) return;

				let type = 0;
				switch(client.config.status.type) {
				case "PLAYING":
					type = 0;
					break;
				case "STREAMING":
					type = 1;
					break;
				case "LISTENING":
					type = 2;
					break;
				case "WATCHING":
					type = 3;
					break;
				case "COMPETING":
					type = 4;
					break;
				}

				if (client.config.status.type && client.config.status.text) {
					// If the user just want to set the status but not the activity
					const url = client.config.status.url;
					client.user?.setPresence({
						activities: [{ name: client.config.status.text, type: type, url: (url && url.trim() !== "") ? url : undefined }],
						status: client.config.status.status,
					});
				}
				client.user?.setStatus(client.config.status.status);
			}
		}

		setStatus();
		setInterval(setStatus, 9e5); // 15 minutes

		readline.cursorTo(process.stdout, 0);
		process.stdout.write(
			`\x1b[0m🚀  The bot is ready! Logged in as \x1b[37;46;1m${client.user?.tag}\x1b[0m (\x1b[37;46;1m${client.user?.id}\x1b[0m)
		\x1b[0m🌟  You can leave a star on GitHub: \x1b[37;46;1mhttps://github.com/Sayrix/ticket-bot \x1b[0m
		\x1b[0m📖  Documentation: \x1b[37;46;1mhttps://doc.ticket.pm \x1b[0m
		\x1b[0m⛅  Host your ticket-bot by being a sponsor from 1$/month: \x1b[37;46;1mhttps://github.com/sponsors/Sayrix \x1b[0m\n`.replace(/\t/g, "")
		);

		const a = await axios.get("https://raw.githubusercontent.com/Sayrix/sponsors/main/sponsors.json").catch(() => {return;});
		if (a) {
			const sponsors = a.data as SayrixSponsorData[];
			const sponsorsList = sponsors
				.map((s) => `\x1b]8;;https://github.com/${s.sponsor.login}\x1b\\\x1b[1m${s.sponsor.login}\x1b]8;;\x1b\\\x1b[0m`)
				.join(", ");
			process.stdout.write(`\x1b[0m💖  Thanks to our sponsors: ${sponsorsList}\n`);
		}

		let connected = false;

		function telemetry(connection: connection) {
			connection.sendUTF(
				JSON.stringify({
					type: "telemetry",
					data: {
						stats: {
							guilds: client?.guilds?.cache?.size,
							users: client?.users?.cache?.size
						},
						infos: {
							ticketbotVersion: version,
							nodeVersion: process.version,
							os: os.platform(),
							osVersion1: os.release(),
							osVersion2: os.version(),
							uptime: process.uptime(),
							ram: {
								total: os.totalmem(),
								free: os.freemem()
							},
							cpu: {
								model: os.cpus()[0].model,
								cores: os.cpus().length,
								arch: os.arch()
							}
						},
						clientName: client?.user?.tag,
						clientId: client?.user?.id,
						guildId: client?.config?.guildId
					}
				})
			);
		}

		async function connect() {
			if (connected) return;
			const ws = new WebSocketClient();

			ws.on("connectFailed", (e) => {
				connected = false;
				setTimeout(connect, Math.random() * 1e4);
				console.log(`❌  WebSocket Error: ${e.toString()}`);
			});

			ws.on("connect", (connection) => {
				connection.on("error", (e) => {
					connected = false;
					setTimeout(connect, Math.random() * 1e4);
					console.log(`❌  WebSocket Error: ${e.toString()}`);
				});

				connection.on("close", (e) => {
					connected = false;
					setTimeout(connect, Math.random() * 1e4);
					console.log(`❌  WebSocket Error: ${e.toString()}`);
				});

				connected = true;
				console.log("✅  Connected to WebSocket server.");
				telemetry(connection);

				setInterval(() => {
					telemetry(connection);
				}, 120_000);
			});

			ws.connect("wss://ws.ticket.pm", "echo-protocol");
		}
		if(!client.config.disableTelemetry) {
			console.warn(`
			PRIVACY NOTICES
			-------------------------------
			Telemetry is current enabled and the following information are sent to the server anonymously:
			* Discord Bot's number of guilds & users
			* Current Source Version
			* NodeJS Version
			* OS Version
			* CPU version, name, core count, architecture, and model
			* Current Process up-time
			* System total ram and freed ram
			* Client name and id
			* Guild ID
			-------------------------------
			If you do not wish to send this ifnormation, please set "disableTelemetry" to true in the config
			`);
			connect();
		}
		deployCmd.deployCommands();
	}
};

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

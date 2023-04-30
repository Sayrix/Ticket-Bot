/* eslint-disable no-process-exit */
/* eslint-disable no-unused-vars */
const readline = require("readline");
const axios = require("axios");
const Discord = require("discord.js");
const WebSocketClient = require("websocket").client;

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

module.exports = {
	name: "ready",
	once: true,
	/**
	 * @param {Discord.Client} client
	 */
	async execute(client) {
		if (!client.config.guildId) {
			console.log("⚠️⚠️⚠️ Please add the guild id in the config.jsonc file. ⚠️⚠️⚠️");
			process.exit(0);
		}

		await client.guilds.fetch(client.config.guildId);
		await client.guilds.cache.get(client.config.guildId).members.fetch();
		if (!client.guilds.cache.get(client.config.guildId).members.me.permissions.has("Administrator")) {
			console.log("\n⚠️⚠️⚠️ I don't have the Administrator permission, to prevent any issues please add the Administrator permission to me. ⚠️⚠️⚠️");
			process.exit(0);
		}

		async function sendEmbedToOpen() {
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

			let embed = client.embeds.openTicket;

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
			embed.footer.text = "ticket.pm" + client.embeds.ticketOpened.footer.text.replace("ticket.pm", ""); // Please respect the LICENSE :D
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

			const row = new Discord.ActionRowBuilder().addComponents(
				new Discord.ButtonBuilder().setCustomId("openTicket").setLabel(client.locales.other.openTicketButtonMSG).setStyle(Discord.ButtonStyle.Primary)
			);

			try {
				const msg = await openTicketChannel?.messages?.fetch(embedMessageId).catch(() => {});
				if (msg && msg.id) {
					msg.edit({
						embeds: [embed],
						components: [row]
					});
				} else {
					client.channels.cache
						.get(client.config.openTicketChannelId)
						.send({
							embeds: [embed],
							components: [row]
						})
						.then((msg) => {
							client.db.set("temp.openTicketMessageId", msg.id);
						});
				}
			} catch (e) {
				console.error(e);
			}
		}

		sendEmbedToOpen();

		readline.cursorTo(process.stdout, 0);
		process.stdout.write(
			`\x1b[0m🚀  The bot is ready! Logged in as \x1b[37;46;1m${client.user.tag}\x1b[0m (\x1b[37;46;1m${client.user.id}\x1b[0m)
		\x1b[0m🌟  You can leave a star on GitHub: \x1b[37;46;1mhttps://github.com/Sayrix/ticket-bot \x1b[0m
		\x1b[0m📖  Documentation: \x1b[37;46;1mhttps://doc.ticket.pm \x1b[0m
		\x1b[0m⛅  Host your ticket-bot by being a sponsor from 1$/month: \x1b[37;46;1mhttps://github.com/sponsors/Sayrix \x1b[0m\n`.replace(/\t/g, "")
		);

		const a = await axios.get("https://raw.githubusercontent.com/Sayrix/sponsors/main/sponsors.json").catch(() => {});
		if (a) {
			const sponsors = a.data;
			const sponsorsList = sponsors
				.map((s) => `\x1b]8;;https://github.com/${s.sponsor.login}\x1b\\\x1b[1m${s.sponsor.login}\x1b]8;;\x1b\\\x1b[0m`)
				.join(", ");
			process.stdout.write(`\x1b[0m💖  Thanks to our sponsors: ${sponsorsList}\n`);
		}

		let connected;

		function telemetry(connection) {
			connection.sendUTF(
				JSON.stringify({
					type: "telemetry",
					data: {
						stats: {
							guilds: client?.guilds?.cache?.size,
							users: client?.users?.cache?.size
						},
						infos: {
							ticketbotVersion: require("../package.json").version,
							nodeVersion: process.version,
							os: require("os").platform(),
							osVersion1: require("os").release(),
							osVersion2: require("os").version(),
							uptime: process.uptime(),
							ram: {
								total: require("os").totalmem(),
								free: require("os").freemem()
							},
							cpu: {
								model: require("os").cpus()[0].model,
								cores: require("os").cpus().length,
								arch: require("os").arch()
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
			let ws = new WebSocketClient();

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

			ws.connect("wss://ws.ticket.pm/", "echo-protocol");
		}

		connect();
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

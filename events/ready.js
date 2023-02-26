const readline = require("readline");
const axios = require("axios");
const Discord = require("discord.js");

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
	async execute(client) {
		if (!client.config.guildId) {
			console.log("⚠️⚠️⚠️ Please add the guild id in the config.jsonc file. ⚠️⚠️⚠️");
			throw 0;
		}

		await client.guilds.fetch(client.config.guildId);
		await client.guilds.cache.get(client.config.guildId).members.fetch();
		if (
			!client.guilds.cache
				.get(client.config.guildId)
				.members.me.permissions.has("Administrator")
		) {
			console.log(
				"\n⚠️⚠️⚠️ I don't have the Administrator permission, to prevent any issues please add the Administrator permission to me. ⚠️⚠️⚠️"
			);
			throw 0;
		}

		async function sendEmbedToOpen() {
			const embedMessageId = await client.db.get("temp.openTicketMessageId");
			await client.channels
				.fetch(client.config.openTicketChannelId)
				.catch((e) =>
					console.error("The channel to open tickets is not found!\n", e)
				);
			const openTicketChannel = await client.channels.cache.get(
				client.config.openTicketChannelId
			);
			if (!openTicketChannel) {
				console.error("The channel to open tickets is not found!");
				throw 0;
			}

			if (!openTicketChannel.isTextBased()) {
				console.error("The channel to open tickets is not a channel!");
				throw 0;
			}

			if (openTicketChannel.messages) {
				await openTicketChannel.messages
					.fetch(embedMessageId)
					.then((msg) => {
						msg.delete().catch(() => {});
					}).catch(() => {});
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
			embed.footer.text =
        "is.gd/ticketbot" +
        client.embeds.ticketOpened.footer.text.replace("is.gd/ticketbot", ""); // Please respect the LICENSE :D
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
				new Discord.ButtonBuilder()
					.setCustomId("openTicket")
					.setLabel(client.locales.other.openTicketButtonMSG)
					.setStyle(Discord.ButtonStyle.Primary)
			);

			try {
				client.channels.cache
					.get(client.config.openTicketChannelId)
					.send({
						embeds: [embed],
						components: [row],
					})
					.then((msg) => {
						client.db.set("temp.openTicketMessageId", msg.id);
					});
			} catch (e) {
				console.error(e);
			}
		}

		sendEmbedToOpen();

		readline.cursorTo(process.stdout, 0);
		process.stdout.write(
			`\x1b[0m🚀  The bot is ready! Logged in as \x1b[37;46;1m${client.user.tag}\x1b[0m (\x1b[37;46;1m${client.user.id}\x1b[0m)
		\x1b[0m🌟  You can leave a star on GitHub: \x1b[37;46;1mhttps://github.com/Sayrix/ticket-bot \x1b[0m
		\x1b[0m📖  Documentation: \x1b[37;46;1mhttps://ticket-bot.pages.dev \x1b[0m
		\x1b[0m🪙  Host your ticket-bot by being a sponsor from 1$/month: \x1b[37;46;1mhttps://github.com/sponsors/Sayrix \x1b[0m\n`.replace(
					/\t/g,
					""
				)
		);

		const a = await axios
			.get(
				"https://raw.githubusercontent.com/Sayrix/sponsors/main/sponsors.json"
			)
			.catch(() => {});
		if (a) {
			const sponsors = a.data;
			const sponsorsList = sponsors
				.map(
					(s) =>
						`\x1b]8;;https://github.com/${s.sponsor.login}\x1b\\\x1b[1m${s.sponsor.login}\x1b]8;;\x1b\\\x1b[0m`
				)
				.join(", ");
			process.stdout.write(
				`\x1b[0m💖  Thanks to our sponsors: ${sponsorsList}\n`
			);
		}
	},
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

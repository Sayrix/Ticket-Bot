const { generateMessages } = require("ticket-bot-transcript-uploader");
const zlib = require("zlib");
const axios = require("axios");
const Discord = require("discord.js");
let domain = "https://ticket.pm/";

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
	async close(interaction, client, reason) {
		if (!client.config.createTranscript) domain = client.locales.other.unavailable;

		const ticket = await client.db.get(`tickets_${interaction.channel.id}`);
		if (!ticket)
			return interaction
				.editReply({ content: "Ticket not found" })
				.catch((e) => console.log(e));

		if (
			client.config.whoCanCloseTicket === "STAFFONLY" &&
			!interaction.member.roles.cache.some((r) =>
				client.config.rolesWhoHaveAccessToTheTickets.includes(r.id)
			)
		)
			return interaction
				.editReply({
					content: client.locales.ticketOnlyClosableByStaff,
					ephemeral: true,
				})
				.catch((e) => console.log(e));

		if (ticket.closed)
			return interaction
				.editReply({
					content: client.locales.ticketAlreadyClosed,
					ephemeral: true,
				})
				.catch((e) => console.log(e));

		client.log(
			"ticketClose",
			{
				user: {
					tag: interaction.user.tag,
					id: interaction.user.id,
					avatarURL: interaction.user.displayAvatarURL(),
				},
				ticketId: ticket.id,
				ticketChannelId: interaction.channel.id,
				ticketCreatedAt: ticket.createdAt,
				reason: reason,
			},
			client
		);

		await client.db.set(
			`tickets_${interaction.channel.id}.closedBy`,
			interaction.user.id
		);
		await client.db.set(
			`tickets_${interaction.channel.id}.closedAt`,
			Date.now()
		);

		if (reason) {
			await client.db.set(
				`tickets_${interaction.channel.id}.closeReason`,
				reason
			);
		} else {
			await client.db.set(
				`tickets_${interaction.channel.id}.closeReason`,
				client.locales.other.noReasonGiven
			);
		}

		const creator = await client.db.get(
			`tickets_${interaction.channel.id}.creator`
		);
		const invited = await client.db.get(
			`tickets_${interaction.channel.id}.invited`
		);

		interaction.channel.permissionOverwrites
			.edit(creator, {
				ViewChannel: false,
			})
			.catch((e) => console.log(e));

		invited.forEach(async (user) => {
			interaction.channel.permissionOverwrites
				.edit(user, {
					ViewChannel: false,
				})
				.catch((e) => console.log(e));
		});

		interaction
			.editReply({
				content: client.locales.ticketCreatingTranscript,
			})
			.catch((e) => console.log(e));

		await interaction.channel.messages.fetch();

		async function close(id) {
			if (client.config.closeTicketCategoryId)
				interaction.channel
					.setParent(client.config.closeTicketCategoryId)
					.catch((e) => console.log(e));

			const messageId = await client.db.get(
				`tickets_${interaction.channel.id}.messageId`
			);
			const msg = interaction.channel.messages.cache.get(messageId);
			const embed = msg.embeds[0].data;
			
			msg.components[0]?.components?.map((x) => {
				if (x.data.custom_id === "close") x.data.disabled = true;
				if (x.data.custom_id === "close_askReason") x.data.disabled = true;
			});
			
			msg
				.edit({
					content: msg.content,
					embeds: [embed],
					components: msg.components,
				})
				.catch((e) => console.log(e));

			await client.db.set(`tickets_${interaction.channel.id}.closed`, true);

			interaction.channel
				.send({
					content: client.locales.ticketTranscriptCreated.replace(
						"TRANSCRIPTURL",
						domain === client.locales.other.unavailable ? client.locales.other.unavailable : `<${domain}${id}>`
					),
				})
				.catch((e) => console.log(e));
			await client.db.set(
				`tickets_${interaction.channel.id}.transcriptURL`,
				domain === client.locales.other.unavailable ? client.locales.other.unavailable : `${domain}${id}`
			);
			const ticket = await client.db.get(`tickets_${interaction.channel.id}`);

			const row = new Discord.ActionRowBuilder().addComponents(
				new Discord.ButtonBuilder()
					.setCustomId("deleteTicket")
					.setLabel(client.locales.other.deleteTicketButtonMSG)
					.setStyle(Discord.ButtonStyle.Danger)
			);

			interaction.channel
				.send({
					embeds: [
						JSON.parse(
							JSON.stringify(client.locales.embeds.ticketClosed)
								.replace("TICKETCOUNT", ticket.id)
								.replace("REASON", ticket.closeReason.replace(/[\n\r]/g, "\\n"))
								.replace("CLOSERNAME", interaction.user.tag)
						),
					],
					components: [row],
				})
				.catch((e) => console.log(e));

			const tiketClosedDMEmbed = new Discord.EmbedBuilder()
				.setColor(
					client.embeds.ticketClosedDM.color
						? client.embeds.ticketClosedDM.color
						: client.config.mainColor
				)
				.setDescription(
					client.embeds.ticketClosedDM.description
						.replace("TICKETCOUNT", ticket.id)
						.replace("TRANSCRIPTURL", `${domain}${id}`)
						.replace("REASON", ticket.closeReason)
						.replace("CLOSERNAME", interaction.user.tag)
				)

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

				.setFooter({
					// Please respect the project by keeping the credits, (if it is too disturbing you can credit me in the "about me" of the bot discord)
					text:
            "is.gd/ticketbot" +
            client.embeds.ticketClosedDM.footer.text.replace(
            	"is.gd/ticketbot",
            	""
            ), // Please respect the LICENSE :D
					// Please respect the project by keeping the credits, (if it is too disturbing you can credit me in the "about me" of the bot discord)
					iconUrl: client.embeds.ticketClosedDM.footer.iconUrl,
				});

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

			client.users.fetch(creator).then((user) => {
				user
					.send({
						embeds: [tiketClosedDMEmbed],
					})
					.catch((e) => console.log(e));
			});
		};

		if (!client.config.createTranscript) {
			close("");
			return;
		}

		async function fetchAll() {
			let collArray = new Array();
			let lastID = interaction.channel.lastMessageID;
			// eslint-disable-next-line no-constant-condition
			while (true) {
				const fetched = await interaction.channel.messages.fetch({ limit: 100, before: lastID });
				if (fetched.size === 0) {
					break;
				}
				collArray.push(fetched);
				lastID = fetched.last().id;
				if (fetched.size !== 100) {
					break;
				}
			}
			const messages = collArray[0].concat(...collArray.slice(1));
			return messages;
		};

		const messages = await fetchAll();
		const premiumKey = "";

		const messagesJSON = await generateMessages(messages, premiumKey, "https://m.ticket.pm");
		zlib.gzip(JSON.stringify(messagesJSON), async (err, compressed) => {
			if (err) {
				console.error(err);
			} else {
				const ts = await axios.post(`${domain}upload?key=${premiumKey}`, JSON.stringify(compressed), {
					headers: {
						"Content-Type": "application/json"
					}
				}).catch(console.error);
				close(ts.data);
			};
		});
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
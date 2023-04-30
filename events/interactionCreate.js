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
	name: "interactionCreate",
	once: false,
	/**
	 * @param {Discord.Interaction} interaction
	 * @param {Discord.Client} client
	 */
	async execute(interaction, client) {
		if (interaction.isButton()) {
			if (interaction.customId === "openTicket") {
				await interaction.deferReply({ ephemeral: true }).catch((e) => console.log(e));

				// Max ticket opened

				for (let role of client.config.rolesWhoCanNotCreateTickets) {
					if (role && interaction.member.roles.cache.has(role)) {
						return interaction
							.editReply({
								content: "You can't create a ticket because you are blacklisted",
								ephemeral: true,
							})
							.catch((e) => console.log(e));
					}
				}

				const all = (await client.db.all()).filter((data) => data.id.startsWith("tickets_"));
				const ticketsOpened = all.filter((data) => data.value.creator === interaction.user.id && data.value.closed === false).length;
				if (client.config.maxTicketOpened !== 0) {
					// If maxTicketOpened is 0, it means that there is no limit
					if (ticketsOpened > client.config.maxTicketOpened || ticketsOpened === client.config.maxTicketOpened) {
						return interaction
							.editReply({
								content: client.locales.ticketLimitReached.replace("TICKETLIMIT", client.config.maxTicketOpened),
								ephemeral: true,
							})
							.catch((e) => console.log(e));
					}
				}

				// Make a select menus of all tickets types

				let options = [];

				for (let x of client.config.ticketTypes) {
					// x.cantAccess is an array of roles id
					// If the user has one of the roles, he can't access to this ticket type

					const a = {
						label: x.name,
						value: x.codeName,
					};
					if (x.description) a.description = x.description;
					if (x.emoji) a.emoji = x.emoji;
					options.push(a);
				}

				for (let x of options) {
					let option = client.config.ticketTypes.filter((y) => y.codeName === x.value)[0];
					if (option.cantAccess) {
						for (let role of option.cantAccess) {
							if (role && interaction.member.roles.cache.has(role)) {
								options = options.filter((y) => y.value !== x.value);
							}
						}
					}
				}

				const row = new Discord.ActionRowBuilder().addComponents(
					new Discord.StringSelectMenuBuilder()
						.setCustomId("selectTicketType")
						.setPlaceholder(client.locales.other.selectTicketTypePlaceholder)
						.setMaxValues(1)
						.addOptions(options)
				);

				interaction
					.editReply({
						ephemeral: true,
						components: [row],
					})
					.catch((e) => console.log(e));
			}

			if (interaction.customId === "claim") {
				const { claim } = require("../utils/claim.js");
				claim(interaction, client);
			}

			if (interaction.customId === "close") {
				await interaction.deferReply({ ephemeral: true }).catch((e) => console.log(e));
				const { close } = require("../utils/close.js");
				close(interaction, client, client.locales.other.noReasonGiven);
			}

			if (interaction.customId === "close_askReason") {
				const { closeAskReason } = require("../utils/close_askReason.js");
				closeAskReason(interaction, client);
			}

			if (interaction.customId === "deleteTicket") {
				const { deleteTicket } = require("../utils/delete.js");
				deleteTicket(interaction, client);
			}
		}

		if (interaction.isStringSelectMenu()) {
			if (interaction.customId === "selectTicketType") {
				const all = (await client.db.all()).filter((data) => data.id.startsWith("tickets_"));
				const ticketsOpened = all.filter((data) => data.value.creator === interaction.user.id && data.value.closed === false).length;
				if (client.config.maxTicketOpened !== 0) {
					// If maxTicketOpened is 0, it means that there is no limit
					if (ticketsOpened > client.config.maxTicketOpened || ticketsOpened === client.config.maxTicketOpened) {
						return interaction
							.reply({
								content: client.locales.ticketLimitReached.replace("TICKETLIMIT", client.config.maxTicketOpened),
								ephemeral: true,
							})
							.catch((e) => console.log(e));
					}
				}

				const ticketType = client.config.ticketTypes.find((x) => x.codeName === interaction.values[0]);
				if (!ticketType) return console.error(`Ticket type ${interaction.values[0]} not found!`);
				if (ticketType.askQuestions) {
					const modal = new client.discord.ModalBuilder().setCustomId("askReason").setTitle(client.locales.modals.reasonTicketOpen.title);

					ticketType.questions.forEach((x, i) => {
						const input = new client.discord.TextInputBuilder()
							.setCustomId(`input_${interaction.values[0]}_${i}`)
							.setLabel(x.label)
							.setStyle(x.style == "SHORT" ? client.discord.TextInputStyle.Short : client.discord.TextInputStyle.Paragraph)
							.setPlaceholder(x.placeholder)
							.setMaxLength(x.maxLength);

						const firstActionRow = new client.discord.ActionRowBuilder().addComponents(input);
						modal.addComponents(firstActionRow);
					});

					await interaction.showModal(modal).catch((e) => console.log(e));
				} else {
					require("../utils/createTicket.js").createTicket(interaction, client, ticketType, client.locales.other.noReasonGiven);
				}
			}

			if (interaction.customId === "removeUser") {
				const ticket = await client.db.get(`tickets_${interaction.message.channelId}`);
				client.db.pull(`tickets_${interaction.message.channel.id}.invited`, interaction.values);

				interaction.values.forEach((value) => {
					interaction.channel.permissionOverwrites.delete(value).catch((e) => console.log(e));

					client.log(
						"userRemoved",
						{
							user: {
								tag: interaction.user.tag,
								id: interaction.user.id,
								avatarURL: interaction.user.displayAvatarURL(),
							},
							ticketId: ticket.id,
							ticketChannelId: interaction.channel.id,
							removed: {
								id: value,
							},
						},
						client
					);
				});

				interaction
					.update({
						content: `> Removed ${
							interaction.values.length < 1 ? interaction.values : interaction.values.map((a) => `<@${a}>`).join(", ")
						} from the ticket`,
						components: [],
					})
					.catch((e) => console.log(e));
			}
		}

		if (interaction.isModalSubmit()) {
			if (interaction.customId === "askReason") {
				const type = interaction.fields.fields.first().customId.split("_")[1];
				const ticketType = client.config.ticketTypes.find((x) => x.codeName === type);
				if (!ticketType) return console.error(`Ticket type ${interaction.values[0]} not found!`);
				require("../utils/createTicket.js").createTicket(interaction, client, ticketType, interaction.fields.fields);
			}

			if (interaction.customId === "askReasonClose") {
				await interaction.deferReply().catch((e) => console.log(e));
				const { close } = require("../utils/close.js");
				close(interaction, client, interaction.fields.fields.first().value);
			}
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

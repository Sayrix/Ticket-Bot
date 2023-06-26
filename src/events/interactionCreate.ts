import { ActionRowBuilder, GuildChannel, GuildMember, Interaction, ModalBuilder, SelectMenuComponentOptionData, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { DiscordClient } from "../Types";
import { log } from "../utils/logs";
import {createTicket} from "../utils/createTicket";
import { close } from "../utils/close";
import { claim } from "../utils/claim";
import { closeAskReason } from "../utils/close_askReason";
import { deleteTicket } from "../utils/delete";

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
	name: "interactionCreate",
	once: false,
	/**
	 * @param {Discord.Interaction} interaction
	 * @param {Discord.Client} client
	 */
	async execute(interaction: Interaction, client: DiscordClient) {
		if (interaction.isButton()) {
			if (interaction.customId === "openTicket") {
				await interaction.deferReply({ ephemeral: true }).catch((e) => console.log(e));

				// Max ticket opened

				for (const role of client.config.rolesWhoCanNotCreateTickets) {
					if (role && (interaction.member as GuildMember | null)?.roles.cache.has(role)) {
						return interaction
							.editReply({
								content: "You can't create a ticket because you are blacklisted"
							})
							.catch((e) => console.log(e));
					}
				}
				
				if (client.config.maxTicketOpened !== 0) {
					const ticketsOpened = (await client.prisma.$queryRaw<[{count: bigint}]>
						`SELECT COUNT(*) as count FROM tickets WHERE closereason IS NULL`)[0].count;
					
					// If maxTicketOpened is 0, it means that there is no limit
					if (ticketsOpened > client.config.maxTicketOpened || ticketsOpened === BigInt(client.config.maxTicketOpened)) {
						return interaction
							.editReply({
								content: client.locales.ticketLimitReached.replace("TICKETLIMIT", client.config.maxTicketOpened.toString())
							})
							.catch((e) => console.log(e));
					}
				}

				// Make a select menus of all tickets types
				let options: SelectMenuComponentOptionData[] = [];

				for (const x of client.config.ticketTypes) {
					// x.cantAccess is an array of roles id
					// If the user has one of the roles, he can't access to this ticket type

					const a: SelectMenuComponentOptionData = {
						label: x.name,
						value: x.codeName,
					};
					if (x.description) a.description = x.description;
					if (x.emoji) a.emoji = x.emoji;
					options.push(a);
				}

				for (const x of options) {
					const option = client.config.ticketTypes.filter((y) => y.codeName === x.value)[0];
					if (option.cantAccess) {
						for (const role of option.cantAccess) {
							if (role && (interaction.member as GuildMember | null)?.roles.cache.has(role)) {
								options = options.filter((y) => y.value !== x.value);
							}
						}
					}
				}

				if (options.length <= 0) return interaction.editReply({
					content: client.locales.noTickets
				});

				const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId("selectTicketType")
						.setPlaceholder(client.locales.other.selectTicketTypePlaceholder)
						.setMaxValues(1)
						.addOptions(options)
				);

				interaction
					.editReply({
						components: [row],
					})
					.catch((e) => console.log(e));
			}

			if (interaction.customId === "claim") {
				claim(interaction, client);
			}

			if (interaction.customId === "close") {
				await interaction.deferReply({ ephemeral: true }).catch((e) => console.log(e));
				close(interaction, client, client.locales.other.noReasonGiven);
			}

			if (interaction.customId === "close_askReason") {
				closeAskReason(interaction, client);
			}

			if (interaction.customId === "deleteTicket") {
				deleteTicket(interaction, client);
			}
		}

		if (interaction.isStringSelectMenu()) {
			if (interaction.customId === "selectTicketType") {				
				if (client.config.maxTicketOpened !== 0) {
					const ticketsOpened = (await client.prisma.$queryRaw<[{count: bigint}]>
						`SELECT COUNT(*) as count FROM tickets WHERE closereason IS NULL`)[0].count;
					// If maxTicketOpened is 0, it means that there is no limit
					if (ticketsOpened > client.config.maxTicketOpened || ticketsOpened === client.config.maxTicketOpened) {
						return interaction
							.reply({
								content: client.locales.ticketLimitReached.replace("TICKETLIMIT", client.config.maxTicketOpened.toString()),
								ephemeral: true,
							})
							.catch((e) => console.log(e));
					}
				}

				const ticketType = client.config.ticketTypes.find((x) => x.codeName === interaction.values[0]);
				if (!ticketType) return console.error(`Ticket type ${interaction.values[0]} not found!`);
				if (ticketType.askQuestions) {
					const modal = new ModalBuilder().setCustomId("askReason").setTitle(client.locales.modals.reasonTicketOpen.title);

					ticketType.questions.forEach((x, i) => {
						const input = new TextInputBuilder()
							.setCustomId(`input_${interaction.values[0]}_${i}`)
							.setLabel(x.label)
							.setStyle(x.style == "SHORT" ? TextInputStyle.Short : TextInputStyle.Paragraph)
							.setPlaceholder(x.placeholder)
							.setMaxLength(x.maxLength);

						const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
						modal.addComponents(firstActionRow);
					});

					await interaction.showModal(modal).catch((e) => console.log(e));
				} else {
					createTicket(interaction, client, ticketType, client.locales.other.noReasonGiven);
				}
			}

			if (interaction.customId === "removeUser") {
				const ticket = await client.prisma.tickets.findUnique({
					select: {
						id: true,
					},
					where: {
						channelid: interaction.message.channelId
					}
				});

				interaction.values.forEach((value) => {
					(interaction.channel as GuildChannel | null)?.permissionOverwrites.delete(value).catch((e) => console.log(e));

					log(
						{
							LogType: "userRemoved",
							user: interaction.user,
							ticketId: ticket?.id.toString(),
							ticketChannelId: interaction.channel?.id,
							target: {
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
				const type = interaction.fields.fields.first()?.customId.split("_")[1];
				const ticketType = client.config.ticketTypes.find((x) => x.codeName === type);
				// Using customId until the value can be figured out
				if (!ticketType) return console.error(`Ticket type ${interaction.customId} not found!`);
				createTicket(interaction, client, ticketType, interaction.fields.fields);
			}

			if (interaction.customId === "askReasonClose") {
				await interaction.deferReply().catch((e) => console.log(e));
				close(interaction, client, interaction.fields.fields.first()?.value);
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

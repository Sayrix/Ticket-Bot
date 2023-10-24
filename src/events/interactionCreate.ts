import { ActionRowBuilder, GuildChannel, GuildMember, Interaction, ModalBuilder, SelectMenuComponentOptionData, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { log } from "../utils/logs";
import {createTicket} from "../utils/createTicket";
import { close } from "../utils/close";
import { claim } from "../utils/claim";
import { closeAskReason } from "../utils/close_askReason";
import { deleteTicket } from "../utils/delete";
import {BaseEvent, ExtendedClient} from "../structure";

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

export default class InteractionCreateEvent extends BaseEvent {
	constructor(client: ExtendedClient) {
		super(client);
	}

	public async execute(interaction: Interaction): Promise<void>  {
		if (interaction.isChatInputCommand()) {
			const command = this.client.commands.get(interaction.commandName);
			if (!command) return;

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(error);
				await interaction.reply({
					content: "There was an error while executing this command!",
					ephemeral: true
				});
			}
		}

		if (interaction.isButton()) {
			if (interaction.customId === "openTicket") {
				await interaction.deferReply({ ephemeral: true }).catch((e) => console.log(e));

				const tCount = this.client.config.ticketTypes.length;
				if(tCount === 0 || tCount > 25) {
					await interaction.followUp({content: this.client.locales.getValue("invalidConfig"), ephemeral: true});
					throw new Error("ticketTypes either has nothing or exceeded 25 entries. Please check the config and restart the bot");
				}

				for (const role of this.client.config.rolesWhoCanNotCreateTickets) {
					if (role && (interaction.member as GuildMember | null)?.roles.cache.has(role)) {
						interaction
							.editReply({
								content: "You can't create a ticket because you are blacklisted"
							})
							.catch((e) => console.log(e));
						return;
					}
				}
				
				// Max Ticket
				if (this.client.config.maxTicketOpened > 0) {
					const ticketsOpened = (await this.client.prisma.$queryRaw<[{count: bigint}]>
					`SELECT COUNT(*) as count FROM tickets WHERE closedby IS NULL AND creator = ${interaction.user.id}`)[0].count;

					// If maxTicketOpened is 0, it means that there is no limit
					if (ticketsOpened >= this.client.config.maxTicketOpened) {
						interaction
							.editReply({
								content: this.client.locales.getValue("ticketLimitReached").replace("TICKETLIMIT", this.client.config.maxTicketOpened.toString())
							})
							.catch((e) => console.log(e));
						return;
					}
				}

				// Make a select menus of all tickets types
				let options: SelectMenuComponentOptionData[] = [];

				for (const x of this.client.config.ticketTypes) {
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
					const option = this.client.config.ticketTypes.filter((y) => y.codeName === x.value)[0];
					if (option.cantAccess) {
						for (const role of option.cantAccess) {
							if (role && (interaction.member as GuildMember | null)?.roles.cache.has(role)) {
								options = options.filter((y) => y.value !== x.value);
							}
						}
					}
				}

				if (options.length <= 0) {
					interaction.editReply({
						content: this.client.locales.getValue("noTickets")
					});
					return;
				}

				const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId("selectTicketType")
						.setPlaceholder(this.client.locales.getSubValue("other", "selectTicketTypePlaceholder"))
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
				claim(interaction, this.client);
			}

			if (interaction.customId === "close") {
				await interaction.deferReply({ ephemeral: true }).catch((e) => console.log(e));
				close(interaction, this.client, this.client.locales.getSubValue("other", "noReasonGiven"));
			}

			if (interaction.customId === "close_askReason") {
				closeAskReason(interaction, this.client);
			}

			if (interaction.customId === "deleteTicket") {
				deleteTicket(interaction, this.client);
			}
		}

		if (interaction.isStringSelectMenu()) {
			if (interaction.customId === "selectTicketType") {
				if (this.client.config.maxTicketOpened > 0) {
					const ticketsOpened = (await this.client.prisma.$queryRaw<[{count: bigint}]>
					`SELECT COUNT(*) as count FROM tickets WHERE closedby IS NULL AND creator = ${interaction.user.id}`)[0].count;
					// If maxTicketOpened is 0, it means that there is no limit
					if (ticketsOpened >= this.client.config.maxTicketOpened) {
						interaction
							.reply({
								content: this.client.locales.getValue("ticketLimitReached").replace("TICKETLIMIT", this.client.config.maxTicketOpened.toString()),
								ephemeral: true,
							})
							.catch((e) => console.log(e));
						return;
					}
				}

				const ticketType = this.client.config.ticketTypes.find((x) => x.codeName === interaction.values[0]);
				if (!ticketType) return console.error(`Ticket type ${interaction.values[0]} not found!`);
				if (ticketType.askQuestions) {
					// Sanity Check
					const qCount = ticketType.questions.length;
					if(qCount === 0 || qCount > 5)
						throw new Error(`${ticketType.codeName} has either no questions or exceeded 5 questions. Check your config and restart the bot`);

					const modal = new ModalBuilder().setCustomId("askReason").setTitle(this.client.locales.getSubValue("modals", "reasonTicketOpen", "title"));
					for (const question of ticketType.questions) {
						const index = ticketType.questions.indexOf(question);
						const input = new TextInputBuilder()
							.setCustomId(`input_${interaction.values[0]}_${index}`)
							.setLabel(question.label)
							.setStyle(question.style == "SHORT" ? TextInputStyle.Short : TextInputStyle.Paragraph)
							.setPlaceholder(question.placeholder)
							.setMaxLength(question.maxLength);

						const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
						modal.addComponents(firstActionRow);
					}

					await interaction.showModal(modal).catch((e) => console.log(e));
				} else {
					createTicket(interaction, this.client, ticketType, this.client.locales.getSubValue("other", "noReasonGiven"));
				}
			}

			if (interaction.customId === "removeUser") {
				const ticket = await this.client.prisma.tickets.findUnique({
					select: {
						id: true,
						invited: true,
					},
					where: {
						channelid: interaction.message.channelId
					}
				});
				for (const value of interaction.values) {
					await (interaction.channel as GuildChannel | null)?.permissionOverwrites.delete(value).catch((e) => console.log(e));
					await log(
						{
							LogType: "userRemoved",
							user: interaction.user,
							ticketId: ticket?.id.toString(),
							ticketChannelId: interaction.channel?.id,
							target: {
								id: value,
							},
						},
						this.client
					);
				}

				// Update the data in the database
				await this.client.prisma.tickets.update({
					data: {
						invited: JSON.stringify((JSON.parse(ticket?.invited ?? "[]") as string[])
							.filter(userid=>interaction.values.find(rUID=>rUID===userid) === undefined))
					},
					where: {
						channelid: interaction.channel?.id
					}
				});

				await interaction
					.update({
						content: `> Removed ${
							interaction.values.length < 1 ? interaction.values : interaction.values.map((a) => `<@${a}>`).join(", ")
						} from the ticket`,
						components: [],
					});
			}
		}

		if (interaction.isModalSubmit()) {
			if (interaction.customId === "askReason") {
				const type = interaction.fields.fields.first()?.customId.split("_")[1];
				const ticketType = this.client.config.ticketTypes.find((x) => x.codeName === type);
				// Using customId until the value can be figured out
				if (!ticketType) return console.error(`Ticket type ${interaction.customId} not found!`);
				createTicket(interaction, this.client, ticketType, interaction.fields.fields);
			}

			if (interaction.customId === "askReasonClose") {
				await interaction.deferReply().catch((e) => console.log(e));
				close(interaction, this.client, interaction.fields.fields.first()?.value);
			}
		}
	}
}

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

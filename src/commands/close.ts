import { CommandInteraction, GuildMember, SlashCommandBuilder } from "discord.js";
import { closeAskReason } from "../utils/close_askReason";
import {close} from "../utils/close.js";
import {BaseCommand, ExtendedClient, TicketType} from "../structure";

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

export default class CloseCommand extends BaseCommand {
	public static data: SlashCommandBuilder = <SlashCommandBuilder>new SlashCommandBuilder()
		.setName("close").setDescription("Close the ticket");
	constructor(client: ExtendedClient) {
		super(client);
	}

	async execute(interaction: CommandInteraction) {
		
		// @TODO: Breaking change refactor happens here as well..
		
		const ticket = await this.client.prisma.tickets.findUnique({
			where: {
				channelid: interaction.channel?.id
			}
		});
		const ticketType = ticket ? JSON.parse(ticket.category) as TicketType : undefined;

		if (
			this.client.config.closeOption.whoCanCloseTicket === "STAFFONLY" &&
			!(interaction.member as GuildMember | null)?.roles.cache.some((r) => this.client.config.rolesWhoHaveAccessToTheTickets.includes(r.id) ||
			ticketType?.staffRoles?.includes(r.id))
		)
			return interaction
				.reply({
					content: this.client.locales.getValue("ticketOnlyClosableByStaff"),
					ephemeral: true,
				})
				.catch((e) => console.log(e));

		if (this.client.config.closeOption.askReason) {
			closeAskReason(interaction, this.client);
		} else {
			await interaction.deferReply().catch((e) => console.log(e));
			close(interaction, this.client);
		}	}
}

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

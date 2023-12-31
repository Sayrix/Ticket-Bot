import { CommandInteraction, GuildMember, SlashCommandBuilder, TextChannel } from "discord.js";
import {BaseCommand, ExtendedClient, TicketType} from "../structure";

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

export default class RenameCommand extends BaseCommand {
	public static data: SlashCommandBuilder = <SlashCommandBuilder>new SlashCommandBuilder()
		.setName("rename")
		.setDescription("Rename the ticket")
		.addStringOption((option) => option.setName("name").setDescription("The new name of the ticket").setRequired(true));
	constructor(client: ExtendedClient) {
		super(client);
	}

	async execute(interaction: CommandInteraction) {
		const ticket = await this.client.prisma.tickets.findUnique({
			where: {
				channelid: interaction.channel?.id
			}
		});
		// @TODO: Breaking change refactor happens here as well..
		const ticketType = ticket ? JSON.parse(ticket.category) as TicketType : undefined;

		if (!ticket) return interaction.reply({ content: "Ticket not found", ephemeral: true }).catch((e) => console.log(e));
		if (!(interaction.member as GuildMember | null)?.roles.cache.some((r) => this.client.config.rolesWhoHaveAccessToTheTickets.includes(r.id) ||
			ticketType?.staffRoles?.includes(r.id)))
			return interaction
				.reply({
					content: this.client.locales.getValue("ticketOnlyRenamableByStaff"),
					ephemeral: true,
				})
				.catch((e) => console.log(e));

		(interaction.channel as TextChannel)?.setName(interaction.options.get("name", true).value as string).catch((e) => console.log(e));
		interaction
			.reply({ content: this.client.locales.getValue("ticketRenamed").replace("NEWNAME", (interaction.channel as TextChannel | null)?.toString() ?? "Unknown"), ephemeral: false })
			.catch((e) => console.log(e));	}
}

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

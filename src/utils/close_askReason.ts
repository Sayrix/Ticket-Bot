/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

import { ActionRowBuilder, ButtonInteraction, CommandInteraction, GuildMember, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import {ExtendedClient, TicketType} from "../structure";

export const closeAskReason = async(interaction: CommandInteraction | ButtonInteraction, client: ExtendedClient) => {

	// @TODO: Breaking change refactor happens here as well..
	const ticket = await client.prisma.tickets.findUnique({
		where: {
			channelid: interaction.channel?.id
		}
	});
	const ticketType = ticket ? JSON.parse(ticket.category) as TicketType : undefined;
	
	if (
		client.config.closeOption.whoCanCloseTicket === "STAFFONLY" &&
		!(interaction.member as GuildMember | null)?.roles.cache.some((r) => client.config.rolesWhoHaveAccessToTheTickets.includes(r.id) ||
		ticketType?.staffRoles?.includes(r.id))
	)
		return interaction
			.reply({
				content: client.locales.getValue("ticketOnlyClosableByStaff"),
				ephemeral: true,
			})
			.catch((e) => console.log(e));

	const modal = new ModalBuilder().setCustomId("askReasonClose").setTitle(client.locales.getSubValue("modals", "reasonTicketClose", "title"));

	const input = new TextInputBuilder()
		.setCustomId("reason")
		.setLabel(client.locales.getSubValue("modals","reasonTicketClose", "label"))
		.setStyle(TextInputStyle.Paragraph)
		.setPlaceholder(client.locales.getSubValue("modals", "reasonTicketClose", "placeholder"))
		.setMaxLength(256);

	const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
	modal.addComponents(firstActionRow);
	await interaction.showModal(modal).catch((e) => console.log(e));
};

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

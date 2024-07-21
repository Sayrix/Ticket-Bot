/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

import { ButtonInteraction, ChannelType } from "discord.js";
import { log } from "./logs";
import {ExtendedClient} from "../structure";

export const deleteTicket = async (interaction: ButtonInteraction, client: ExtendedClient) => {

	if(!interaction.channel || interaction.channel.type !== ChannelType.GuildText)
		return await interaction.reply({
			content: "This command can only be used in a ticket channel.",
			ephemeral: true
		});
	
	const ticket = await client.prisma.tickets.findUnique({
		where: {
			channelid: interaction.channel.id
		}
	});

	if (!ticket) return await interaction.reply({ content: "Ticket not found", ephemeral: true });
	log(
		{
			LogType: "ticketDelete",
			user: interaction.user,
			ticketId: ticket.id,
			ticketCreatedAt: ticket.createdat,
			transcriptURL: ticket.transcript ?? undefined,
		},
		client
	);
	await interaction.deferUpdate();
	await interaction.channel.delete();
};

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

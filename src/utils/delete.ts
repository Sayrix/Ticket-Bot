/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

import { ButtonInteraction } from "discord.js";
import { log } from "./logs";
import {ExtendedClient} from "../structure";

export const deleteTicket = async (interaction: ButtonInteraction, client: ExtendedClient) => {
	const ticket = await client.prisma.tickets.findUnique({
		where: {
			channelid: interaction.channel?.id
		}
	});

	if (!ticket) return interaction.reply({ content: "Ticket not found", ephemeral: true }).catch((e) => console.log(e));
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
	interaction.channel?.delete().catch((e) => console.log(e));
};

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

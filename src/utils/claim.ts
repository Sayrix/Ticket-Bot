/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

import { APIButtonComponent, ActionRowBuilder, ButtonBuilder, ButtonInteraction, ChannelType, CommandInteraction, EmbedBuilder, GuildMember, TextChannel } from "discord.js";
import { log } from "./logs";
import {ExtendedClient, TicketType} from "../structure";

export const claim = async(interaction: ButtonInteraction | CommandInteraction, client: ExtendedClient) => {
	let ticket = await client.prisma.tickets.findUnique({
		where: {
			channelid: interaction.channel?.id
		}
	});
	const claimed = ticket?.claimedat && ticket.claimedby;

	if (!ticket)
	   return interaction.reply({
		   content: "Ticket not found",
		   ephemeral: true,
	   });

	// @TODO: Breaking change refactor happens here as well..
	const ticketType = ticket ? JSON.parse(ticket.category) as TicketType : undefined;
	const canClaim = (interaction.member as GuildMember | null)?.roles.cache.some((r) => client.config.rolesWhoHaveAccessToTheTickets.includes(r.id) ||
	ticketType?.staffRoles?.includes(r.id));

	if (!canClaim)
	   return interaction
		   .reply({
			   content: client.locales.getValue("ticketOnlyClaimableByStaff"),
			   ephemeral: true,
		   })
		   .catch((e) => console.log(e));

	if (claimed)
	   return interaction
		   .reply({
			   content: client.locales.getValue("ticketAlreadyClaimed"),
			   ephemeral: true,
		   })
		   .catch((e) => console.log(e));

	log(
	   {
			LogType: "ticketClaim",
		    user: interaction.user,
		    ticketId: ticket.id.toString(),
		    ticketChannelId: interaction.channel?.id,
		    ticketCreatedAt: ticket.createdat,
	   },
	   client
	);

	ticket = await client.prisma.tickets.update({
		data: {
			claimedby: interaction.user.id,
			claimedat: Date.now()
		},
		where: {
			channelid: interaction.channel?.id,
		}
	});

	const msg = await interaction.channel?.messages.fetch(ticket.messageid);
	const oldEmbed = msg?.embeds[0].data;
	const newEmbed = new EmbedBuilder(oldEmbed)
		.setDescription(oldEmbed?.description + `\n\n ${client.locales.getSubValue("other", "claimedBy").replace("USER", `<@${interaction.user.id}>`)}`);

	const row = new ActionRowBuilder<ButtonBuilder>();
	msg?.components[0].components.map((x) => {
		const btnBuilder = new ButtonBuilder(x.data as APIButtonComponent);
	   	if (x.customId === "claim") btnBuilder.setDisabled(true);
		row.addComponents(btnBuilder);
	});

   	msg?.edit({
		   content: msg.content,
		   embeds: [newEmbed],
		   components: [row],
	}).catch((e) => console.log(e));

   	interaction
	   .reply({
		   content: client.locales.getValue("ticketClaimedMessage").replace("USER", `<@${interaction.user.id}>`),
		   ephemeral: false,
	   })
	   .catch((e) => console.log(e));

	const defaultName = client.config.claimOption.nameWhenClaimed;
   	if (defaultName && defaultName.trim() !== "") {
		const creatorUser = await client.users.fetch(ticket.creator);
		const newName = defaultName
			.replaceAll("S_USERNAME", interaction.user.username)
			.replaceAll("U_USERNAME", creatorUser.username)
			.replaceAll("S_USERID", interaction.user.id)
			.replaceAll("U_USERID", creatorUser.id)
			.replaceAll("TICKETCOUNT", ticket.id.toString());
	   await (interaction.channel as TextChannel | null)?.setName(newName).catch((e) => console.log(e));
   	}

	const categoryID = client.config.claimOption.categoryWhenClaimed;
	if(categoryID && categoryID.trim() !== "") {
		const category = await interaction.guild?.channels.fetch(categoryID);
		if(category?.type !== ChannelType.GuildCategory)
			return console.error("claim.ts: USER ERROR - Invalid categoryWhenClaimed ID. Channel must be a category.");
		await (interaction.channel as TextChannel | null)?.setParent(category);
	}
};
/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

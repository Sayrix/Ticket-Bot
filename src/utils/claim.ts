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

import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, CommandInteraction, EmbedBuilder, GuildMember, TextChannel } from "discord.js";
import { DiscordClient } from "../Types";
import { log } from "./logs";


/**
* @param {Discord.CommandInteraction} interaction
* @param {Discord.Client} client
*/
export const claim = async(interaction: ButtonInteraction | CommandInteraction, client: DiscordClient) => {
	const ticket = await client.db.get(`tickets_${interaction.channel?.id}`);
	if (!ticket)
	   return interaction.reply({
		   content: "Ticket not found",
		   ephemeral: true,
	   });

	const canClaim = (interaction.member as GuildMember | null)?.roles.cache.some((r) => client.config.rolesWhoHaveAccessToTheTickets.includes(r.id));

	if (!canClaim)
	   return interaction
		   .reply({
			   content: client.locales.ticketOnlyClaimableByStaff,
			   ephemeral: true,
		   })
		   .catch((e) => console.log(e));

	if (ticket.claimed)
	   return interaction
		   .reply({
			   content: client.locales.ticketAlreadyClaimed,
			   ephemeral: true,
		   })
		   .catch((e) => console.log(e));

	log(
	   {
			LogType: "ticketClaim",
		    user: interaction.user,
		    ticketId: ticket.id,
		    ticketChannelId: interaction.channel?.id,
		    ticketCreatedAt: ticket.createdAt,
	   },
	   client
	);

	await client.db.set(`tickets_${interaction.channel?.id}.claimed`, true);
	await client.db.set(`tickets_${interaction.channel?.id}.claimedBy`, interaction.user.id);
	await client.db.set(`tickets_${interaction.channel?.id}.claimedAt`, Date.now());

	//await interaction.channel?.messages.fetch(); // Commented bc it seems useless
	const messageId = await client.db.get(`tickets_${interaction.channel?.id}.messageId`);
	const msg = interaction.channel?.messages.cache.get(messageId);
	const oldEmbed = msg?.embeds[0].data;
	const newEmbed = new EmbedBuilder(oldEmbed)
		.setDescription(oldEmbed?.description + `\n\n ${client.locales.other.claimedBy.replace("USER", `<@${interaction.user.id}>`)}`);

	const row = new ActionRowBuilder<ButtonBuilder>();
	msg?.components[0].components.map((x) => {
		const btnBuilder = new ButtonBuilder(x.data);
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
		   content: client.locales.ticketClaimedMessage.replace("USER", `<@${interaction.user.id}>`),
		   ephemeral: false,
	   })
	   .catch((e) => console.log(e));

   	if (client.config.ticketNamePrefixWhenClaimed) {
	   (interaction.channel as TextChannel | null)?.setName(`${client.config.ticketNamePrefixWhenClaimed}${(interaction.channel as TextChannel | null)?.name}`).catch((e) => console.log(e));
   	}
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

import {CommandInteraction, SlashCommandBuilder, TextChannel} from "discord.js";
import { DiscordClient } from "../Types";
import { log } from "../utils/logs";

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
	data: new SlashCommandBuilder()
		.setName("add")
		.setDescription("Add someone to the ticket")
		.addUserOption((input) => input.setName("user").setDescription("The user to add").setRequired(true)),
	async execute(interaction: CommandInteraction, client: DiscordClient) {
		const added = interaction.options.getUser("user", true);

		const ticket = await client.prisma.tickets.findUnique({
			select: {
				id: true,
				invited: true,
			},
			where: {
				channelid: interaction.channel?.id
			}
		});
		if (!ticket) return interaction.reply({ content: "Ticket not found", ephemeral: true }).catch((e) => console.log(e));
		
		const invited = JSON.parse(ticket.invited) as string[];
		if (invited.includes(added.id)) return interaction.reply({ content: "User already added", ephemeral: true }).catch((e) => console.log(e));

		if (invited.length >= 25)
			return interaction.reply({ content: "You can't add more than 25 users", ephemeral: true }).catch((e) => console.log(e));

		invited.push(added.id);
		await client.prisma.tickets.update({
			data: {
				invited: JSON.stringify(invited)
			},
			where: {
				channelid: interaction.channel?.id
			}
		});

		await (interaction.channel as TextChannel | null)?.permissionOverwrites
			.edit(added, {
				SendMessages: true,
				AddReactions: true,
				ReadMessageHistory: true,
				AttachFiles: true,
				ViewChannel: true,
			})
			.catch((e) => console.log(e));

		interaction.reply({ content: `> Added <@${added.id}> to the ticket` }).catch((e) => console.log(e));

		log(
			{
				LogType: "userAdded",
				user: interaction.user,
				ticketId: ticket.id.toString(),
				ticketChannelId: interaction.channel?.id,
				target: added,
			},
			client
		);
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

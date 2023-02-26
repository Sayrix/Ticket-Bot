const { SlashCommandBuilder } = require("discord.js");

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

module.exports = {
	data: new SlashCommandBuilder()
		.setName("add")
		.setDescription("Add someone to the ticket")
		.addUserOption((input) =>
			input.setName("user").setDescription("The user to add").setRequired(true)
		),
	async execute(interaction, client) {
		const added = interaction.options.getUser("user");
		const ticket = await client.db.get(`tickets_${interaction.channel.id}`);
		if (!ticket)
			return interaction
				.reply({ content: "Ticket not found", ephemeral: true })
				.catch((e) => console.log(e));
		if (ticket.invited.includes(added.id))
			return interaction
				.reply({ content: "User already added", ephemeral: true })
				.catch((e) => console.log(e));

		if (ticket.invited.lenght >= 25)
			return interaction
				.reply({ content: "You can't add more than 25 users", ephemeral: true })
				.catch((e) => console.log(e));

		client.db.push(`tickets_${interaction.channel.id}.invited`, added.id);

		await interaction.channel.permissionOverwrites
			.edit(added, {
				SendMessages: true,
				AddReactions: true,
				ReadMessageHistory: true,
				AttachFiles: true,
				ViewChannel: true,
			})
			.catch((e) => console.log(e));

		interaction
			.reply({ content: `> Added <@${added.id}> to the ticket` })
			.catch((e) => console.log(e));

		client.log(
			"userAdded",
			{
				user: {
					tag: interaction.user.tag,
					id: interaction.user.id,
					avatarURL: interaction.user.displayAvatarURL(),
				},
				ticketId: ticket.id,
				ticketChannelId: interaction.channel.id,
				added: {
					id: added.id,
				},
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

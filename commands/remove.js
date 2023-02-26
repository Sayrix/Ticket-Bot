const {
	SlashCommandBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
} = require("discord.js");

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
		.setName("remove")
		.setDescription("Remove someone from the ticket"),
	async execute(interaction, client) {
		const ticket = await client.db.get(`tickets_${interaction.channel.id}`);
		if (!ticket)
			return interaction
				.reply({ content: "Ticket not found", ephemeral: true })
				.catch((e) => console.log(e));
		if (ticket.invited.length < 1)
			return interaction
				.reply({ content: "There are no users to remove", ephemeral: true })
				.catch((e) => console.log(e));

		for (let i = 0; i < ticket.invited.length; i++) {
			await client.users.fetch(ticket.invited[i]);
		}

		const addedUsers = ticket.invited.map((user) =>
			client.users.cache.get(user)
		);

		const row = new ActionRowBuilder().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId("removeUser")
				.setPlaceholder("Please select a user to remove")
				.setMinValues(1)
				.setMaxValues(ticket.invited.length)
				.addOptions(
					addedUsers.map((user) => {
						return {
							label: user.tag,
							value: user.id,
						};
					})
				)
		);

		interaction.reply({ components: [row] }).catch((e) => console.log(e));
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

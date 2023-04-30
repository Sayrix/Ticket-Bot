const { SlashCommandBuilder } = require("discord.js");
// eslint-disable-next-line no-unused-vars
const Discord = require("discord.js");

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
		.setName("rename")
		.setDescription("Rename the ticket")
		.addStringOption((option) => option.setName("name").setDescription("The new name of the ticket").setRequired(true)),
	/**
	 *
	 * @param {Discord.Interaction} interaction
	 * @param {Discord.Client} client
	 * @returns
	 */
	async execute(interaction, client) {
		const ticket = await client.db.get(`tickets_${interaction.channel.id}`);
		if (!ticket) return interaction.reply({ content: "Ticket not found", ephemeral: true }).catch((e) => console.log(e));
		if (!interaction.member.roles.cache.some((r) => client.config.rolesWhoHaveAccessToTheTickets.includes(r.id)))
			return interaction
				.reply({
					content: client.locales.ticketOnlyRenamableByStaff,
					ephemeral: true,
				})
				.catch((e) => console.log(e));

		interaction.channel.setName(interaction.options.getString("name")).catch((e) => console.log(e));
		interaction
			.reply({ content: client.locales.ticketRenamed.replace("NEWNAME", interaction.channel.toString()), ephemeral: false })
			.catch((e) => console.log(e));
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

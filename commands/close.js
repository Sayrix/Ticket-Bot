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
		.setName("close")
		.setDescription("Close the ticket"),
	async execute(interaction, client) {
		if (
			client.config.whoCanCloseTicket === "STAFFONLY" &&
      !interaction.member.roles.cache.some((r) =>
      	client.config.rolesWhoHaveAccessToTheTickets.includes(r.id)
      )
		)
			return interaction
				.reply({
					content: client.locales.ticketOnlyClosableByStaff,
					ephemeral: true,
				})
				.catch((e) => console.log(e));

		if (client.config.askReasonWhenClosing) {
			const { closeAskReason } = require("../utils/close_askReason.js");
			closeAskReason(interaction, client);
		} else {
			await interaction.deferReply().catch((e) => console.log(e));
			const { close } = require("../utils/close.js");
			close(interaction, client);
		}
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

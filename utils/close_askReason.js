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
	async closeAskReason(interaction, client) {
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

		const modal = new Discord.ModalBuilder()
			.setCustomId("askReasonClose")
			.setTitle(client.locales.modals.reasonTicketClose.title);

		const input = new Discord.TextInputBuilder()
			.setCustomId("reason")
			.setLabel(client.locales.modals.reasonTicketClose.label)
			.setStyle(Discord.TextInputStyle.Paragraph)
			.setPlaceholder(client.locales.modals.reasonTicketClose.placeholder)
			.setMaxLength(256);

		const firstActionRow = new Discord.ActionRowBuilder().addComponents(input);
		modal.addComponents(firstActionRow);
		await interaction.showModal(modal).catch((e) => console.log(e));
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

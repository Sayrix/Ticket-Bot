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

import { ActionRowBuilder, ButtonInteraction, CommandInteraction, GuildMember, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import {ExtendedClient} from "../structure";

export const closeAskReason = async(interaction: CommandInteraction | ButtonInteraction, client: ExtendedClient) => {
	if (
		client.config.closeOption.whoCanCloseTicket === "STAFFONLY" &&
		!(interaction.member as GuildMember | null)?.roles.cache.some((r) => client.config.rolesWhoHaveAccessToTheTickets.includes(r.id))
	)
		return interaction
			.reply({
				content: client.locales.getValue("ticketOnlyClosableByStaff"),
				ephemeral: true,
			})
			.catch((e) => console.log(e));

	const modal = new ModalBuilder().setCustomId("askReasonClose").setTitle(client.locales.getSubValue("modals", "reasonTicketClose", "title"));

	const input = new TextInputBuilder()
		.setCustomId("reason")
		.setLabel(client.locales.getSubValue("modals","reasonTicketClose", "label"))
		.setStyle(TextInputStyle.Paragraph)
		.setPlaceholder(client.locales.getSubValue("modals", "reasonTicketClose", "placeholder"))
		.setMaxLength(256);

	const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
	modal.addComponents(firstActionRow);
	await interaction.showModal(modal).catch((e) => console.log(e));
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

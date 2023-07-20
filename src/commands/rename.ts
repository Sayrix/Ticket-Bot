import { CommandInteraction, GuildMember, SlashCommandBuilder, TextChannel } from "discord.js";
import {BaseCommand, ExtendedClient} from "../structure";

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

export default class RenameCommand extends BaseCommand {
	public static data: SlashCommandBuilder = <SlashCommandBuilder>new SlashCommandBuilder()
		.setName("rename")
		.setDescription("Rename the ticket")
		.addStringOption((option) => option.setName("name").setDescription("The new name of the ticket").setRequired(true));
	constructor(client: ExtendedClient) {
		super(client);
	}

	async execute(interaction: CommandInteraction) {
		const ticket = await this.client.prisma.tickets.findUnique({
			where: {
				channelid: interaction.channel?.id
			}
		});
		if (!ticket) return interaction.reply({ content: "Ticket not found", ephemeral: true }).catch((e) => console.log(e));
		if (!(interaction.member as GuildMember | null)?.roles.cache.some((r) => this.client.config.rolesWhoHaveAccessToTheTickets.includes(r.id)))
			return interaction
				.reply({
					content: this.client.locales.getValue("ticketOnlyRenamableByStaff"),
					ephemeral: true,
				})
				.catch((e) => console.log(e));

		(interaction.channel as TextChannel)?.setName(interaction.options.get("name", true).value as string).catch((e) => console.log(e));
		interaction
			.reply({ content: this.client.locales.getValue("ticketRenamed").replace("NEWNAME", (interaction.channel as TextChannel | null)?.toString() ?? "Unknown"), ephemeral: false })
			.catch((e) => console.log(e));	}
}

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

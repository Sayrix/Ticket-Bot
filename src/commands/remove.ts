import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, CommandInteraction, User } from "discord.js";
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

export default class RemoveCommand extends BaseCommand {
	public static data: SlashCommandBuilder = <SlashCommandBuilder>new SlashCommandBuilder()
		.setName("remove").setDescription("Remove someone from the ticket");
	constructor(client: ExtendedClient) {
		super(client);
	}

	async execute(interaction: CommandInteraction) {
		const ticket = await this.client.prisma.tickets.findUnique({
			select: {
				invited: true,
			},
			where: {
				channelid: interaction.channel?.id
			}
		});
		if (!ticket) return interaction.reply({ content: "Ticket not found", ephemeral: true }).catch((e) => console.log(e));

		const invited = JSON.parse(ticket.invited) as string[];
		if (invited.length < 1) return interaction.reply({ content: "There are no users to remove", ephemeral: true }).catch((e) => console.log(e));

		const addedUsers: User[] = [];
		for (let i = 0; i < invited.length; i++) {
			addedUsers.push(await this.client.users.fetch(invited[i]));
		}

		const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId("removeUser")
				.setPlaceholder("Please select a user to remove")
				.setMinValues(1)
				.setMaxValues(ticket.invited.length)
				.addOptions(
					// @TODO: Fix type definitions when I figure it out via ORM migration. For now assign a random type that gets the error removed.
					addedUsers.map((user) => {
						return {
							label: user.tag,
							value: user.id,
						};
					})
				)
		);

		interaction.reply({ components: [row] }).catch((e) => console.log(e));	}
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

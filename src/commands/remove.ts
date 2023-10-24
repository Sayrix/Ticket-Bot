import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, CommandInteraction, User } from "discord.js";
import {BaseCommand, ExtendedClient} from "../structure";

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

export default class RemoveCommand extends BaseCommand {
	public static data: SlashCommandBuilder = <SlashCommandBuilder>new SlashCommandBuilder()
		.setName("remove")
		.setDescription("Remove someone from the ticket");
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

		const parseInvited = JSON.parse(ticket.invited) as string[];
		if (parseInvited.length < 1) return interaction.reply({ content: "There are no users to remove", ephemeral: true }).catch((e) => console.log(e));

		const addedUsers: User[] = [];
		for (let i = 0; i < parseInvited.length; i++) {
			addedUsers.push(await this.client.users.fetch(parseInvited[i]));
		}

		const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId("removeUser")
				.setPlaceholder("Please select a user to remove")
				.setMinValues(1)
				.setMaxValues(parseInvited.length)
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
		await interaction.reply({ components: [row] }).catch((e) => console.log(e));	}
}

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

import {BaseCommand, ExtendedClient} from "../structure";
import {CommandInteraction, SlashCommandBuilder} from "discord.js";

/*
Copyright © 2024 小兽兽/zhiyan114 (github.com/zhiyan114)
File is licensed respectively under the terms of the Creative Commons Attribution 4.0 International
or whichever license the project is using at the time https://github.com/Sayrix/Ticket-Bot/blob/main/LICENSE.md
*/

export default class AddCommand extends BaseCommand {
	public static data: SlashCommandBuilder = <SlashCommandBuilder>new SlashCommandBuilder()
		.setName("cleardm")
		.setDescription("Clear all of your ticket history in your DM");
	constructor(client: ExtendedClient) {
		super(client);
	}

	async execute(interaction: CommandInteraction) {
		interaction.deferReply({ ephemeral: true });

		const dm = await interaction.user.createDM();

		let messages = (await dm.messages.fetch({ limit: 100 }))
			.filter((message) => message.author.id === this.client.user?.id);
		while(messages.size > 0) {
			for(const message of messages)
				await message[1].delete();
			if(messages.size < 100)
				break;
			messages = await dm.messages.fetch({ limit: 100 });
		}
		await interaction.followUp({ content: "Cleared all of your DM history", ephemeral: true });
	}
}

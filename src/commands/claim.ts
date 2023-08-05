import {BaseCommand, ExtendedClient} from "../structure";
import {claim} from "../utils/claim";
import {CommandInteraction, SlashCommandBuilder} from "discord.js";

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

export default class ClaimCommand extends BaseCommand {
	public static data: SlashCommandBuilder = <SlashCommandBuilder>new SlashCommandBuilder()
		.setName("claim").setDescription("Set the ticket as claimed.");
	constructor(client: ExtendedClient) {
		super(client);
	}

	async execute(interaction: CommandInteraction) {
		return claim(interaction, this.client);
	}
}

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/
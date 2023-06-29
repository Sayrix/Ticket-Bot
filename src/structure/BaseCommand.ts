import {CommandInteraction, SlashCommandBuilder} from "discord.js";
import {ExtendedClient} from "./";

export default  abstract class BaseCommand {
	public static data: SlashCommandBuilder;
	protected client: ExtendedClient;
	protected constructor(client: ExtendedClient) {
		this.client = client;
	}

	abstract execute(interaction: CommandInteraction): void;

}
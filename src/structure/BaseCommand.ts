import {CommandInteraction, InteractionResponse, SlashCommandBuilder} from "discord.js";
import {ExtendedClient} from "./";

export default  abstract class BaseCommand {
	public static data: SlashCommandBuilder;
	protected client: ExtendedClient;
	protected constructor(client: ExtendedClient) {
		this.client = client;
	}
	// eslint-disable-next-line no-unused-vars
	abstract execute(interaction: CommandInteraction): void | Promise<void | InteractionResponse<boolean>>;

}
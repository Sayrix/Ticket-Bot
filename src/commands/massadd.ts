import {BaseCommand, ExtendedClient} from "../structure";
import {CommandInteraction, SlashCommandBuilder, TextChannel} from "discord.js";
import {log} from "../utils/logs";

/*
Copyright © 2023 小兽兽/zhiyan114 (github.com/zhiyan114)
File is licensed respectively under the terms of the Apache License 2.0
or whichever license the project is using at the time https://github.com/Sayrix/Ticket-Bot/blob/main/LICENSE
*/


// Use add command if possible, otherwise you're missing out on proper user validation...
export default class MassAddCommand extends BaseCommand {
	public static data: SlashCommandBuilder = <SlashCommandBuilder>new SlashCommandBuilder()
		.setName("massadd")
		.setDescription("Add multiple users to the ticket. It's recommended to use the regular add command when possible.")
		.addStringOption((input) => input.setName("users").setDescription("Users to add. Use ',' as seperator.").setRequired(true));
	constructor(client: ExtendedClient) {
		super(client);
	}

	async execute(interaction: CommandInteraction) {

		// In-case users will try things
	    const users = await Promise.all((interaction.options.get("users", true).value as string)
			.replace(/\s/g, "") // Remove space incase user adds it as a seperator
			.split(",") // Get a list from it
			.filter((user) => user !== "") // anti seperator spams at the end lmao
			.map(async user => await this.client.users.fetch(user))); // Convert it to discord users objects
		
		// Additional checks
		if(users.length == 0) return await interaction.reply({ content: "You need to specify at least one user", ephemeral: true });
		if(users.length > 25) return await interaction.reply({ content: "You can't add more than 25 users", ephemeral: true });

		const ticket = await this.client.prisma.tickets.findUnique({
			select: {
				id: true,
				invited: true,
			},
			where: {
				channelid: interaction.channel?.id
			}
		});

		if (!ticket) return interaction.reply({ content: "Ticket not found", ephemeral: true }).catch((e) => console.log(e));

		const invited = JSON.parse(ticket.invited) as string[];

		for(const user of users) {
			if (invited.includes(user.id))
				continue;

			if (invited.length >= 25)
				break;

			invited.push(user.id);

			await (interaction.channel as TextChannel | null)?.permissionOverwrites
				.edit(user, {
					SendMessages: true,
					AddReactions: true,
					ReadMessageHistory: true,
					AttachFiles: true,
					ViewChannel: true,
				});
			log(
				{
					LogType: "userAdded",
					user: interaction.user,
					ticketId: ticket.id.toString(),
					ticketChannelId: interaction.channel?.id,
					target: user,
				},
				this.client
			);
		}

		await this.client.prisma.tickets.update({
			data: {
				invited: JSON.stringify(invited)
			},
			where: {
				channelid: interaction.channel?.id
			}
		});

		await interaction.reply({ content: "> Mass User Add Completed! Do note that not all users may be added if internal checks failed. It's advise you use the regular add command to guarantee the add status." });
	}
}

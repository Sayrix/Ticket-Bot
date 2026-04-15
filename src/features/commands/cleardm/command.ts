import { MessageFlags } from "@discordjs/core";
import { defineCommand } from "@/core/defineCommand";
import { editReply, reply } from "@/core/respond";
import { getInteractionUser } from "@/features/tickets/utils";

export default defineCommand({
	data: {
		name: "cleardm",
		description: "Clear the bot's ticket history from your DMs"
	},
	async execute({ app }, interaction) {
		await reply(app, interaction, {
			content: "Clearing your ticket DM history...",
			flags: MessageFlags.Ephemeral
		});

		const user = getInteractionUser(interaction);
		const dmChannel = await app.client.api.users.createDM(user.id).catch(() => null);

		if (!dmChannel?.id) {
			await editReply(app, interaction, {
				content: "I could not access your DM channel."
			});
			return;
		}

		let before: string | undefined;
		let deletedCount = 0;

		while (true) {
			const batch = await app.client.api.channels.getMessages(dmChannel.id, {
				limit: 100,
				before
			});

			if (batch.length === 0) {
				break;
			}

			for (const message of batch) {
				if (message.author.id !== app.applicationId) {
					continue;
				}

				await app.client.api.channels.deleteMessage(dmChannel.id, message.id).catch(() => undefined);
				deletedCount += 1;
			}

			if (batch.length < 100) {
				break;
			}

			before = batch[batch.length - 1]?.id;
		}

		await editReply(app, interaction, {
			content: deletedCount > 0 ? `Cleared ${deletedCount} ticket DM messages.` : "No ticket DM messages were found."
		});
	}
});

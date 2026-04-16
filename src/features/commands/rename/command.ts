import { MessageFlags } from "@discordjs/core";
import { ApplicationCommandOptionType } from "discord-api-types/v10";
import { defineCommand } from "@/core/defineCommand";
import { reply } from "@/core/respond";
import { getStringOption } from "@/features/commands/shared/options";
import { hasTicketStaffAccess } from "@/features/tickets/config-access";
import { getOpenTicketByChannel } from "@/features/tickets/records";
import { getMemberRoleIds, sanitizeChannelName } from "@/features/tickets/utils";

export default defineCommand({
	data: {
		name: "rename",
		description: "Rename the current ticket",
		options: [
			{
				name: "name",
				description: "The new ticket channel name",
				required: true,
				type: ApplicationCommandOptionType.String
			}
		]
	},
	async execute({ app }, interaction) {
		const openTicket = await getOpenTicketByChannel(app, interaction.channel_id);

		if (!openTicket.ok) {
			await reply(app, interaction, {
				content: openTicket.message,
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		if (!hasTicketStaffAccess(app, openTicket.ticketType, getMemberRoleIds(interaction))) {
			await reply(app, interaction, {
				content: "Only staff can rename this ticket.",
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		const requestedName = getStringOption(interaction, "name");

		if (!requestedName) {
			await reply(app, interaction, {
				content: "Provide a new ticket name.",
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		const nextName = sanitizeChannelName(requestedName);
		await app.client.api.channels.edit(openTicket.ticket.channelId, {
			name: nextName
		});

		await reply(app, interaction, {
			content: `Ticket renamed to <#${openTicket.ticket.channelId}>.`,
			flags: MessageFlags.Ephemeral
		});
	}
});

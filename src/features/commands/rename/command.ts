/*
Ticket-Bot is licensed under the GNU Affero General Public License,
version 3 only ("AGPL-3.0-only"). See LICENSE.md for the full license text.

Additional Term under GNU AGPL v3, Section 7(b):

You are required to preserve and display, in a location clearly visible
to end users interacting with the bot (such as bot embeds, the bot's
"Bio" Discord profile, status, or equivalent), a notice that the
software is powered by Ticket-Bot, including a link to the original
project repository or to its website.

This notice must not be removed, obscured, or replaced.
*/

import { MessageFlags } from "@discordjs/core";
import { ApplicationCommandOptionType } from "discord-api-types/v10";
import { defineCommand } from "@/core/defineCommand";
import { reply } from "@/core/respond";
import { getStringOption } from "@/features/commands/shared/options";
import { sendTicketLog, shouldSendTicketLog } from "@/features/logs/service";
import { createTicketLogContext } from "@/features/logs/utils";
import { hasTicketStaffAccess } from "@/features/tickets/config-access";
import { getOpenTicketByChannel } from "@/features/tickets/records";
import { getInteractionUser, getMemberRoleIds, sanitizeChannelName } from "@/features/tickets/utils";

export default defineCommand({
	data: (LL) => ({
		name: "rename",
		description: LL.commands.rename.description(),
		options: [
			{
				name: "name",
				description: LL.commands.rename.options.name.description(),
				required: true,
				type: ApplicationCommandOptionType.String
			}
		]
	}),
	async execute({ app }, interaction) {
		const LL = app.LL;
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
				content: LL.commands.rename.only_staff(),
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		const requestedName = getStringOption(interaction, "name");

		if (!requestedName) {
			await reply(app, interaction, {
				content: LL.commands.rename.provide_name(),
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		const nextName = sanitizeChannelName(requestedName);
		const ticketLogContext = createTicketLogContext(openTicket.ticket, openTicket.ticketType.name);
		let previousName = openTicket.ticket.channelId;

		if (shouldSendTicketLog(app, "ticketRename")) {
			const currentChannel = await app.client.api.channels.get(openTicket.ticket.channelId).catch(() => null);
			previousName =
				currentChannel && "name" in currentChannel && typeof currentChannel.name === "string"
					? currentChannel.name
					: previousName;
		}

		await app.client.api.channels.edit(openTicket.ticket.channelId, {
			name: nextName
		});
		const actor = getInteractionUser(interaction);

		if (shouldSendTicketLog(app, "ticketRename")) {
			void sendTicketLog(app, {
				kind: "ticketRename",
				actor,
				oldChannelName: previousName,
				newChannelName: nextName,
				ticket: ticketLogContext
			});
		}

		await reply(app, interaction, {
			content: LL.commands.rename.success({ channelId: openTicket.ticket.channelId }),
			flags: MessageFlags.Ephemeral
		});
	}
});

/*
Ticket-Bot is licensed under the GNU Affero General Public License,
version 3 only ("AGPL-3.0-only"). See LICENSE.md for the full license text.

Additional Term under GNU AGPL v3, Section 7(b):

You are required to preserve and display, in a location clearly visible
to end users interacting with the bot (such as bot embeds, the bot's
"Bio" Discord profile, status, or equivalent), a notice that the
software is powered by Ticket-Bot, including a link to the original
project repository or to its website.

This notice must not be removed, obscured, or replaced.
*/

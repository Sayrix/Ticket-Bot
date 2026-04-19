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
import { getUserOption } from "@/features/commands/shared/options";
import { sendTicketLog } from "@/features/logs/service";
import { createTicketLogContext } from "@/features/logs/utils";
import {
	getInvitedUserIds,
	grantTicketParticipantAccess,
	MAX_INVITED_TICKET_USERS,
	updateInvitedUserIds
} from "@/features/tickets/participants";
import { getOpenTicketByChannel } from "@/features/tickets/records";
import { getInteractionUser } from "@/features/tickets/utils";

export default defineCommand({
	data: (LL) => ({
		name: "add",
		description: LL.commands.add.description(),
		options: [
			{
				name: "user",
				description: LL.commands.add.options.user.description(),
				required: true,
				type: ApplicationCommandOptionType.User
			}
		]
	}),
	async execute({ app }, interaction) {
		const LL = app.LL;
		const selectedUser = getUserOption(interaction, "user");

		if (!selectedUser) {
			await reply(app, interaction, {
				content: LL.commands.add.choose_user(),
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		const openTicket = await getOpenTicketByChannel(app, interaction.channel_id);

		if (!openTicket.ok) {
			await reply(app, interaction, {
				content: openTicket.message,
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		const invitedUserIds = getInvitedUserIds(openTicket.ticket);

		if (selectedUser.userId === openTicket.ticket.createdBy) {
			await reply(app, interaction, {
				content: LL.commands.add.already_has_access(),
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		if (invitedUserIds.includes(selectedUser.userId)) {
			await reply(app, interaction, {
				content: LL.commands.add.already_invited(),
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		if (invitedUserIds.length >= MAX_INVITED_TICKET_USERS) {
			await reply(app, interaction, {
				content: LL.commands.add.invite_limit_reached({ limit: MAX_INVITED_TICKET_USERS }),
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		await grantTicketParticipantAccess(app, openTicket.ticket.channelId, selectedUser.userId);
		await updateInvitedUserIds(app, openTicket.ticket.channelId, [...invitedUserIds, selectedUser.userId]);
		void sendTicketLog(app, {
			kind: "userAdded",
			actor: getInteractionUser(interaction),
			targetId: selectedUser.userId,
			ticket: createTicketLogContext(openTicket.ticket, openTicket.ticketType.name)
		});

		await reply(app, interaction, {
			content: LL.commands.add.success({ userId: selectedUser.userId }),
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

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

import { MessageFlags, PermissionFlagsBits } from "@discordjs/core";
import { ApplicationCommandOptionType } from "discord-api-types/v10";
import { defineCommand } from "@/core/defineCommand";
import { deferReply, editReply, reply } from "@/core/respond";
import { getUserOption } from "@/features/commands/shared/options";
import { canManageTicketBans, removeTicketBan } from "@/features/tickets/bans";

export default defineCommand({
	data: (LL) => ({
		name: "ticketunban",
		description: LL.commands.ticketunban.description(),
		default_member_permissions: PermissionFlagsBits.BanMembers.toString(),
		options: [
			{
				name: "user",
				description: LL.commands.ticketban.options.user.description(),
				required: true,
				type: ApplicationCommandOptionType.User
			}
		]
	}),
	async execute({ app }, interaction) {
		if (!canManageTicketBans(app, interaction)) {
			await reply(app, interaction, { content: app.LL.commands.ticketban.not_allowed(), flags: MessageFlags.Ephemeral });
			return;
		}
		const user = getUserOption(interaction, "user");
		if (!user) {
			await reply(app, interaction, { content: app.LL.commands.ticketban.choose_user(), flags: MessageFlags.Ephemeral });
			return;
		}
		await deferReply(app, interaction, { flags: MessageFlags.Ephemeral });
		const removed = await removeTicketBan(app, user.userId);
		await editReply(app, interaction, {
			content: removed
				? app.LL.commands.ticketunban.success({ userId: user.userId })
				: app.LL.commands.ticketunban.not_banned({ userId: user.userId }),
			allowed_mentions: { parse: [] }
		});
	}
});

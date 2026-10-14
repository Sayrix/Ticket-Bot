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
import { getStringOption, getUserOption } from "@/features/commands/shared/options";
import { canManageTicketBans, parseTicketBanDuration, setTicketBan } from "@/features/tickets/bans";
import { getInteractionUser } from "@/features/tickets/utils";

export default defineCommand({
	data: (LL) => ({
		name: "ticketban",
		description: LL.commands.ticketban.description(),
		default_member_permissions: PermissionFlagsBits.BanMembers.toString(),
		options: [
			{
				name: "user",
				description: LL.commands.ticketban.options.user.description(),
				required: true,
				type: ApplicationCommandOptionType.User
			},
			{
				name: "duration",
				description: LL.commands.ticketban.options.duration.description(),
				type: ApplicationCommandOptionType.String,
				max_length: 100
			}
		]
	}),
	async execute({ app }, interaction) {
		const LL = app.LL.commands.ticketban;
		if (!canManageTicketBans(app, interaction)) {
			await reply(app, interaction, { content: LL.not_allowed(), flags: MessageFlags.Ephemeral });
			return;
		}
		const user = getUserOption(interaction, "user");
		if (!user) {
			await reply(app, interaction, { content: LL.choose_user(), flags: MessageFlags.Ephemeral });
			return;
		}
		const duration = parseTicketBanDuration(getStringOption(interaction, "duration"));
		if (!duration.ok) {
			await reply(app, interaction, { content: LL.invalid_duration(), flags: MessageFlags.Ephemeral });
			return;
		}
		await deferReply(app, interaction, { flags: MessageFlags.Ephemeral });
		await setTicketBan(app, user.userId, getInteractionUser(interaction).id, duration.expiresAt);
		await editReply(app, interaction, {
			content:
				duration.expiresAt === null
					? LL.success_lifetime({ userId: user.userId })
					: LL.success_until({ userId: user.userId, timestamp: Math.ceil(duration.expiresAt / 1_000) }),
			allowed_mentions: { parse: [] }
		});
	}
});

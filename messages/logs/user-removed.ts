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

import { ComponentType } from "@discordjs/core";
import type { LoadedMessageTemplate, MessageTemplateContext } from "@/features/tickets/types";

const userRemovedLogMessage = ({ LL }: MessageTemplateContext): LoadedMessageTemplate => ({
	components: [
		{
			type: ComponentType.Container,
			accent_color: 16007990,
			components: [
				{ type: ComponentType.TextDisplay, content: LL.logs.templates.user_removed.title() },
				{
					type: ComponentType.TextDisplay,
					content: LL.logs.templates.user_removed.action({
						actorMention: "{actorMention}",
						targetMention: "{targetMention}",
						ticketChannelMention: "{ticketChannelMention}"
					})
				},
				{
					type: ComponentType.TextDisplay,
					content: LL.logs.templates.user_removed.details({
						ticketId: "{ticketId}",
						ticketTypeName: "{ticketTypeName}",
						createdByMention: "{createdByMention}"
					})
				}
			]
		}
	]
});

export default userRemovedLogMessage;

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

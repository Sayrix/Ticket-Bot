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
import { createMessageSlot, createRuntimeTextSlot } from "@/features/tickets/messages";
import type { LoadedMessageTemplate, MessageTemplateContext } from "@/features/tickets/types";

const ticketOpenedMessage = ({ LL }: MessageTemplateContext): LoadedMessageTemplate => ({
	components: [
		{
			type: ComponentType.TextDisplay,
			content: "{createdByMention}{staffMentions}"
		},
		{
			type: ComponentType.Container,
			accent_color: 16106539,
			components: [
				{
					type: ComponentType.TextDisplay,
					content: LL.tickets.templates.ticket_opened.title({ ticketTypeName: "{ticketTypeName}" })
				},
				{
					type: ComponentType.TextDisplay,
					content: LL.tickets.templates.ticket_opened.intro()
				},
				{
					type: ComponentType.TextDisplay,
					content: LL.tickets.templates.ticket_opened.details_label({ reason: "{reason}" })
				},
				createRuntimeTextSlot(),
				{
					type: ComponentType.TextDisplay,
					content: LL.tickets.templates.ticket_opened.claim_status({ claimStatus: "{claimStatus}" })
				},
				createMessageSlot("actions")
			]
		}
	]
});

export default ticketOpenedMessage;

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

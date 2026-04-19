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

const ticketClosedDmBillingMessage = ({ LL }: MessageTemplateContext): LoadedMessageTemplate => ({
	components: [
		{
			type: ComponentType.Container,
			accent_color: 16106539,
			components: [
				{
					type: ComponentType.TextDisplay,
					content: LL.tickets.templates.ticket_closed_dm_billing.title()
				},
				{
					type: ComponentType.TextDisplay,
					content: LL.tickets.templates.ticket_closed_dm_billing.intro()
				},
				{
					type: ComponentType.TextDisplay,
					content: LL.tickets.templates.ticket_closed_dm_billing.details({
						reason: "{reason}",
						claimStatus: "{claimStatus}",
						transcriptStatus: "{transcriptStatus}"
					})
				},
				{
					type: ComponentType.TextDisplay,
					content: LL.tickets.templates.ticket_closed_dm_billing.closed_by({ closerName: "{closerName}" })
				}
			]
		}
	]
});

export default ticketClosedDmBillingMessage;

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

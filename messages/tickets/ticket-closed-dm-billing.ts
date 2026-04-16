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
import type { LoadedMessageTemplate } from "@/features/tickets/types";

const billingTicketClosedDmMessage: LoadedMessageTemplate = {
	components: [
		{
			type: ComponentType.Container,
			accent_color: 16106539,
			components: [
				{
					type: ComponentType.TextDisplay,
					content: "## Your billing ticket has been closed"
				},
				{
					type: ComponentType.TextDisplay,
					content: "If you still need help, open a new billing ticket and include your order details again."
				},
				{
					type: ComponentType.TextDisplay,
					content: "**Reason**\n{reason}"
				},
				{
					type: ComponentType.TextDisplay,
					content: "**Handled By**\n{closerName}"
				},
				{
					type: ComponentType.TextDisplay,
					content: "**Transcript**\n{transcriptStatus}"
				}
			]
		}
	]
};

export default billingTicketClosedDmMessage;

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

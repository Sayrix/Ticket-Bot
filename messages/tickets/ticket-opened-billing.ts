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
import type { LoadedMessageTemplate } from "@/features/tickets/types";

const billingTicketOpenedMessage: LoadedMessageTemplate = {
	components: [
		{
			type: ComponentType.TextDisplay,
			content: "{createdByMention}{staffMentions}"
		},
		{
			type: ComponentType.Container,
			accent_color: 15844367,
			components: [
				{
					type: ComponentType.TextDisplay,
					content: "## Billing Ticket"
				},
				{
					type: ComponentType.TextDisplay,
					content: "Include invoice numbers, payment method, and any failed transaction details."
				},
				{
					type: ComponentType.TextDisplay,
					content: "**Submitted Details**\n{reason}"
				},
				createRuntimeTextSlot(),
				{
					type: ComponentType.TextDisplay,
					content: "**Claim Status**\n{claimStatus}"
				},
				createMessageSlot("actions")
			]
		}
	]
};

export default billingTicketOpenedMessage;

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

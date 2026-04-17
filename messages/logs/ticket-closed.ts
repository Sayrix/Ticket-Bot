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

const ticketClosedLogMessage: LoadedMessageTemplate = {
	components: [
		{
			type: ComponentType.Container,
			accent_color: 16007990,
			components: [
				{ type: ComponentType.TextDisplay, content: "## Ticket Closed" },
				{ type: ComponentType.TextDisplay, content: "{actorMention} closed {ticketChannelMention}." },
				{ type: ComponentType.TextDisplay, content: "**Ticket**\n#{ticketId} • {ticketTypeName}" },
				{ type: ComponentType.TextDisplay, content: "**Opened By**\n{createdByMention}" },
				{ type: ComponentType.TextDisplay, content: "**Claim Status**\n{claimStatus}" },
				{ type: ComponentType.TextDisplay, content: "**Open Age**\n{ticketAge}" },
				{ type: ComponentType.TextDisplay, content: "**Reason**\n{reason}" },
				{ type: ComponentType.TextDisplay, content: "**Transcript**\n{transcriptStatus}" }
			]
		}
	]
};

export default ticketClosedLogMessage;

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

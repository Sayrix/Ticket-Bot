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

const reportTicketClosedDmMessage: LoadedMessageTemplate = {
	components: [
		{
			type: ComponentType.Container,
			accent_color: 15158332,
			components: [
				{
					type: ComponentType.TextDisplay,
					content: "## Your report ticket has been closed"
				},
				{
					type: ComponentType.TextDisplay,
					content: "Staff reviewed the report and any attached evidence."
				},
				{
					type: ComponentType.TextDisplay,
					content: "**Resolution Note**\n{reason}"
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

export default reportTicketClosedDmMessage;

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

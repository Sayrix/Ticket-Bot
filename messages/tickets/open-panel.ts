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

import { ComponentType } from "discord-api-types/v10";
import { createPanelOpenerSlot } from "@/features/tickets/messages";
import type { LoadedMessageTemplate } from "@/features/tickets/types";

// Classic embed + components version:

// const openPanelMessage: LoadedMessageTemplate = {
// 	useComponentsV2: false,
// 	embeds: [
// 		{
// 			title: "Open a Ticket",
// 			description: "Choose the category that matches your request and the bot will create a private ticket for you.",
// 			color: 16106539
// 		}
// 	],
// 	components: [createPanelOpenerSlot()]
// };

// Components V2 version:

const openPanelMessage: LoadedMessageTemplate = {
	useComponentsV2: true,
	components: [
		{
			type: ComponentType.Container,
			accent_color: 16106539,
			components: [
				{
					type: ComponentType.TextDisplay,
					content: "## Open a Ticket"
				},
				{
					type: ComponentType.TextDisplay,
					content: "Choose the category that matches your request and the bot will create a private ticket for you."
				},
				{
					type: ComponentType.Separator
				},
				{
					type: ComponentType.Separator,
					spacing: 1,
					divider: false
				},
				createPanelOpenerSlot()
			]
		}
	]
};

export default openPanelMessage;

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

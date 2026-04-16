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

import { PermissionFlagsBits } from "@discordjs/core";

export const MESSAGE_TEMPLATES_DIRECTORY = new URL("../../../messages", import.meta.url);
export const DEFAULT_NO_REASON = "No additional details were provided.";
export const TICKET_ACCESS_ALLOW =
	PermissionFlagsBits.ViewChannel |
	PermissionFlagsBits.SendMessages |
	PermissionFlagsBits.ReadMessageHistory |
	PermissionFlagsBits.AttachFiles |
	PermissionFlagsBits.EmbedLinks |
	PermissionFlagsBits.AddReactions;

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

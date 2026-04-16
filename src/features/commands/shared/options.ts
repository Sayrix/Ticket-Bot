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

import type { APIChatInputApplicationCommandInteraction, APIUser } from "@discordjs/core";

type RawCommandOption = {
	name: string;
	value?: string;
};

function findOption(interaction: APIChatInputApplicationCommandInteraction, name: string) {
	const options = (interaction.data.options ?? []) as RawCommandOption[];
	return options.find((option) => option.name === name);
}

export function getStringOption(interaction: APIChatInputApplicationCommandInteraction, name: string) {
	const value = findOption(interaction, name)?.value;
	return typeof value === "string" ? value : null;
}

export function getUserOption(interaction: APIChatInputApplicationCommandInteraction, name: string) {
	const userId = getStringOption(interaction, name);

	if (!userId) {
		return null;
	}

	return {
		user: interaction.data.resolved?.users?.[userId] as APIUser | undefined,
		userId
	};
}

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

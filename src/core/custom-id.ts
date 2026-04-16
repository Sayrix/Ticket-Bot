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

const CUSTOM_ID_SEPARATOR = ":";

export interface ParsedCustomId {
	featureKey: string;
	action: string;
	state: string[];
}

export function createCustomId(featureKey: string, action: string, ...state: string[]) {
	return [featureKey, action, ...state.map((part) => encodeURIComponent(part))].join(CUSTOM_ID_SEPARATOR);
}

export function parseCustomId(customId: string): ParsedCustomId | null {
	const [featureKey, action, ...rawState] = customId.split(CUSTOM_ID_SEPARATOR);

	if (!featureKey || !action) {
		return null;
	}

	return {
		featureKey,
		action,
		state: rawState.map((part) => decodeURIComponent(part))
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

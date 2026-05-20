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

import type { GatewayInteractionCreateDispatchData, ToEventProps } from "@discordjs/core";
import { GatewayDispatchEvents, InteractionType } from "@discordjs/core";
import { defineEvent } from "@/core/defineEvent";

const interactionCreateEvent = defineEvent<[ToEventProps<GatewayInteractionCreateDispatchData>]>({
	name: GatewayDispatchEvents.InteractionCreate,
	async execute(app, event) {
		if (event.data.type === InteractionType.Ping) {
			return;
		}

		await app.router.handleInteraction(event.data);
	}
});

export default interactionCreateEvent;

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

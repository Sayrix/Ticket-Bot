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

import type {
	APIApplicationCommandAutocompleteInteraction,
	APIChatInputApplicationCommandInteraction,
	APIMessageComponentInteraction,
	APIModalSubmitInteraction
} from "@discordjs/core";
import { MessageFlags } from "@discordjs/core";
import type { BotApp } from "@/core/types";

type ReplyableInteraction =
	| APIChatInputApplicationCommandInteraction
	| APIMessageComponentInteraction
	| APIModalSubmitInteraction;

type ModalCapableInteraction = APIChatInputApplicationCommandInteraction | APIMessageComponentInteraction;

export async function reply(app: BotApp, interaction: ReplyableInteraction, body: any) {
	return app.client.api.interactions.reply(interaction.id, interaction.token, body);
}

export async function deferReply(app: BotApp, interaction: ReplyableInteraction, body?: any) {
	return app.client.api.interactions.defer(interaction.id, interaction.token, body);
}

export async function editReply(app: BotApp, interaction: ReplyableInteraction, body: any) {
	return app.client.api.interactions.editReply(app.applicationId, interaction.token, body);
}

export async function followUp(app: BotApp, interaction: ReplyableInteraction, body: any) {
	return app.client.api.interactions.followUp(app.applicationId, interaction.token, body);
}

export async function updateMessage(app: BotApp, interaction: APIMessageComponentInteraction, body: any) {
	return app.client.api.interactions.updateMessage(interaction.id, interaction.token, body);
}

export async function showModal(app: BotApp, interaction: ModalCapableInteraction, body: any) {
	return app.client.api.interactions.createModal(interaction.id, interaction.token, body);
}

export async function replyWithAutocomplete(app: BotApp, interaction: APIApplicationCommandAutocompleteInteraction, body: any) {
	return app.client.api.interactions.createAutocompleteResponse(interaction.id, interaction.token, body);
}

export async function replyWithError(app: BotApp, interaction: ReplyableInteraction) {
	return reply(app, interaction, {
		content: app.LL.shared.unexpected_interaction_error(),
		flags: MessageFlags.Ephemeral
	}).catch(() => undefined);
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

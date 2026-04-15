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
		content: "An unexpected error occurred while handling this interaction.",
		flags: MessageFlags.Ephemeral
	}).catch(() => undefined);
}

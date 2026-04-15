import type { APIUser } from "@discordjs/core";
import { ButtonStyle } from "@discordjs/core";
import type { ButtonStyleName } from "@/features/tickets/types";

export function renderTemplate(template: string, tokens: Record<string, string | undefined>) {
	return template.replaceAll(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => tokens[key] ?? "");
}

export function renderChannelName(template: string, tokens: Record<string, string | undefined>) {
	return sanitizeChannelName(renderTemplate(template, tokens));
}

export function sanitizeChannelName(value: string) {
	const cleaned = value
		.toLowerCase()
		.replaceAll(/\s+/g, "-")
		.replaceAll(/[^a-z0-9-_]/g, "-")
		.replaceAll(/-+/g, "-")
		.replaceAll(/^-|-$/g, "");

	return cleaned.slice(0, 100) || "ticket";
}

export function mapButtonStyle(style?: ButtonStyleName) {
	switch (style) {
		case "secondary":
			return ButtonStyle.Secondary;
		case "success":
			return ButtonStyle.Success;
		case "danger":
			return ButtonStyle.Danger;
		default:
			return ButtonStyle.Primary;
	}
}

export function toPartialEmoji(emoji?: string) {
	if (!emoji) {
		return undefined;
	}

	const discordEmojiMatch = emoji.match(/^<a?:[a-zA-Z0-9_]+:(\d+)>$/);

	if (discordEmojiMatch) {
		return {
			id: discordEmojiMatch[1]
		};
	}

	if (/^\d+$/.test(emoji)) {
		return {
			id: emoji
		};
	}

	return {
		name: emoji
	};
}

export function chunk<TValue>(values: TValue[], size: number) {
	const chunks: TValue[][] = [];

	for (let index = 0; index < values.length; index += size) {
		chunks.push(values.slice(index, index + size));
	}

	return chunks;
}

export function isBlockedByRoles(blockedRoleIds: string[], roleIds: string[]) {
	return blockedRoleIds.some((roleId) => roleIds.includes(roleId));
}

export function getInteractionUser(interaction: { member?: { user?: APIUser } | null; user?: APIUser | null }) {
	const user = interaction.member?.user ?? interaction.user;

	if (!user) {
		throw new Error("Missing interaction user.");
	}

	return user;
}

export function getMemberRoleIds(interaction: { member?: { roles?: string[] } | null }) {
	return Array.isArray(interaction.member?.roles) ? interaction.member.roles : [];
}

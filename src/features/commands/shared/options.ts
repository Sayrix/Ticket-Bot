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

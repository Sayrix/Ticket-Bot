import type {
	APIApplicationCommandAutocompleteInteraction,
	APIApplicationCommandInteraction,
	APIChatInputApplicationCommandInteraction,
	APIMessageComponentInteraction,
	APIModalSubmitInteraction
} from "@discordjs/core";
import { ApplicationCommandType, ComponentType, InteractionType } from "@discordjs/core";
import { parseCustomId } from "@/core/custom-id";
import { replyWithError } from "@/core/respond";
import type { BotApp, CommandExecutionContext, ComponentExecutionContext, RoutedInteraction } from "@/core/types";

function isChatInputCommand(
	interaction: APIApplicationCommandInteraction
): interaction is APIChatInputApplicationCommandInteraction {
	return interaction.data.type === ApplicationCommandType.ChatInput;
}

export class InteractionRouter {
	public constructor(private readonly app: BotApp) {}

	public async handleInteraction(interaction: RoutedInteraction) {
		try {
			switch (interaction.type) {
				case InteractionType.ApplicationCommand:
					await this.handleApplicationCommand(interaction as APIApplicationCommandInteraction);
					return;
				case InteractionType.ApplicationCommandAutocomplete:
					await this.handleAutocomplete(interaction as APIApplicationCommandAutocompleteInteraction);
					return;
				case InteractionType.MessageComponent:
					await this.handleMessageComponent(interaction as APIMessageComponentInteraction);
					return;
				case InteractionType.ModalSubmit:
					await this.handleModalSubmit(interaction as APIModalSubmitInteraction);
					return;
				default:
					return;
			}
		} catch (error) {
			this.app.logger.error("Failed to route interaction", error);

			if (interaction.type !== InteractionType.ApplicationCommandAutocomplete) {
				await replyWithError(
					this.app,
					interaction as APIChatInputApplicationCommandInteraction | APIMessageComponentInteraction | APIModalSubmitInteraction
				);
			}
		}
	}

	private async handleApplicationCommand(interaction: APIApplicationCommandInteraction) {
		if (!isChatInputCommand(interaction)) {
			return;
		}

		await this.handleSlashCommand(interaction);
	}

	private async handleSlashCommand(interaction: APIChatInputApplicationCommandInteraction) {
		const command = this.app.registry.commands.get(interaction.data.name);

		if (!command) {
			this.app.logger.warn(`No slash command registered for "${interaction.data.name}".`);
			return;
		}

		const context: CommandExecutionContext = {
			app: this.app
		};

		await command.execute(context, interaction);
	}

	private async handleAutocomplete(interaction: APIApplicationCommandAutocompleteInteraction) {
		const command = this.app.registry.commands.get(interaction.data.name);

		if (!command?.autocomplete) {
			return;
		}

		const context: CommandExecutionContext = {
			app: this.app
		};

		await command.autocomplete(context, interaction);
	}

	private async handleMessageComponent(interaction: APIMessageComponentInteraction) {
		const route = parseCustomId(interaction.data.custom_id);

		if (!route) {
			this.app.logger.warn(`Invalid custom id "${interaction.data.custom_id}".`);
			return;
		}

		const feature = this.app.registry.features.get(route.featureKey);

		if (!feature) {
			this.app.logger.warn(`No feature registered for "${route.featureKey}".`);
			return;
		}

		const context: ComponentExecutionContext = {
			app: this.app,
			feature,
			route
		};

		if (interaction.data.component_type === ComponentType.Button) {
			const handler = feature.buttons?.[route.action];

			if (!handler) {
				this.app.logger.warn(`No button handler "${route.featureKey}:${route.action}".`);
				return;
			}

			await handler(context, interaction);
			return;
		}

		if (interaction.data.component_type === ComponentType.StringSelect) {
			const handler = feature.stringSelects?.[route.action];

			if (!handler) {
				this.app.logger.warn(`No string select handler "${route.featureKey}:${route.action}".`);
				return;
			}

			await handler(context, interaction);
		}
	}

	private async handleModalSubmit(interaction: APIModalSubmitInteraction) {
		const route = parseCustomId(interaction.data.custom_id);

		if (!route) {
			this.app.logger.warn(`Invalid modal custom id "${interaction.data.custom_id}".`);
			return;
		}

		const feature = this.app.registry.features.get(route.featureKey);

		if (!feature) {
			this.app.logger.warn(`No feature registered for modal "${route.featureKey}".`);
			return;
		}

		const context: ComponentExecutionContext = {
			app: this.app,
			feature,
			route
		};

		const handler = feature.modals?.[route.action];

		if (!handler) {
			this.app.logger.warn(`No modal handler "${route.featureKey}:${route.action}".`);
			await replyWithError(this.app, interaction);
			return;
		}

		await handler(context, interaction);
	}
}

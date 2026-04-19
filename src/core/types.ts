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
	APIApplicationCommandInteraction,
	APIChatInputApplicationCommandInteraction,
	APIMessageComponentInteraction,
	APIModalSubmitInteraction,
	Client
} from "@discordjs/core";
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";
import type { drizzle } from "drizzle-orm/libsql";
import type { Locales, TranslationFunctions } from "../../i18n/i18n-types.js";
import type { AnyVersionedConfig } from "@/config/index";
import type { ParsedCustomId } from "@/core/custom-id";
import type { Logger } from "@/core/logger";

export type RoutedInteraction =
	| APIApplicationCommandAutocompleteInteraction
	| APIApplicationCommandInteraction
	| APIMessageComponentInteraction
	| APIModalSubmitInteraction;

export type CommandDataResolver =
	| RESTPostAPIChatInputApplicationCommandsJSONBody
	| ((LL: TranslationFunctions) => RESTPostAPIChatInputApplicationCommandsJSONBody);

export interface CommandModule {
	data: CommandDataResolver;
	execute(context: CommandExecutionContext, interaction: APIChatInputApplicationCommandInteraction): Promise<void>;
	autocomplete?(context: CommandExecutionContext, interaction: APIApplicationCommandAutocompleteInteraction): Promise<void>;
}

export interface FeatureModule {
	key: string;
	buttons?: Record<string, ButtonHandler>;
	stringSelects?: Record<string, StringSelectHandler>;
	modals?: Record<string, ModalHandler>;
}

export interface EventModule<TArgs extends unknown[] = unknown[]> {
	name: string;
	once?: boolean;
	execute(app: BotApp, ...args: TArgs): Promise<void>;
}

export interface HandlerRegistry {
	events: EventModule[];
	features: Map<string, FeatureModule>;
	commands: Map<string, CommandModule>;
	applicationCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[];
}

export interface InteractionRouterContract {
	handleInteraction(interaction: RoutedInteraction): Promise<void>;
}

export interface BotApp {
	client: Client;
	db: ReturnType<typeof drizzle>;
	config: AnyVersionedConfig;
	applicationId: string;
	logger: Logger;
	locale: Locales;
	LL: TranslationFunctions;
	registry: HandlerRegistry;
	router: InteractionRouterContract;
}

export interface FeatureContext {
	app: BotApp;
	feature: FeatureModule;
}

export interface CommandExecutionContext {
	app: BotApp;
}

export interface ComponentExecutionContext extends FeatureContext {
	route: ParsedCustomId;
}

export type ButtonHandler = (context: ComponentExecutionContext, interaction: APIMessageComponentInteraction) => Promise<void>;

export type StringSelectHandler = (
	context: ComponentExecutionContext,
	interaction: APIMessageComponentInteraction
) => Promise<void>;

export type ModalHandler = (context: ComponentExecutionContext, interaction: APIModalSubmitInteraction) => Promise<void>;

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

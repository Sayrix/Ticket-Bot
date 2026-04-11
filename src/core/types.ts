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
import type { ParsedCustomId } from "@/core/custom-id";
import type { Logger } from "@/core/logger";

export type RoutedInteraction =
	| APIApplicationCommandAutocompleteInteraction
	| APIApplicationCommandInteraction
	| APIMessageComponentInteraction
	| APIModalSubmitInteraction;

export interface SlashCommandDefinition {
	data: RESTPostAPIChatInputApplicationCommandsJSONBody;
	execute(context: FeatureContext, interaction: APIChatInputApplicationCommandInteraction): Promise<void>;
	autocomplete?(context: FeatureContext, interaction: APIApplicationCommandAutocompleteInteraction): Promise<void>;
}

export interface FeatureModule {
	key: string;
	commands?: SlashCommandDefinition[];
	buttons?: Record<string, ButtonHandler>;
	stringSelects?: Record<string, StringSelectHandler>;
	modals?: Record<string, ModalHandler>;
}

export interface RegisteredCommand {
	command: SlashCommandDefinition;
	feature: FeatureModule;
}

export interface EventModule<TArgs extends unknown[] = unknown[]> {
	name: string;
	once?: boolean;
	execute(app: BotApp, ...args: TArgs): Promise<void>;
}

export interface HandlerRegistry {
	events: EventModule[];
	features: Map<string, FeatureModule>;
	commands: Map<string, RegisteredCommand>;
	applicationCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[];
}

export interface InteractionRouterContract {
	handleInteraction(interaction: RoutedInteraction): Promise<void>;
}

export interface BotApp {
	client: Client;
	db: ReturnType<typeof drizzle>;
	applicationId: string;
	logger: Logger;
	registry: HandlerRegistry;
	router: InteractionRouterContract;
}

export interface FeatureContext {
	app: BotApp;
	feature: FeatureModule;
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

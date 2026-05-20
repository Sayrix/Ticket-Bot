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

import type { Logger } from "@/core/logger";
import type { BotApp, CommandModule, EventModule, FeatureModule, HandlerRegistry } from "@/core/types";
import type { TranslationFunctions } from "../../i18n/i18n-types.js";
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";

interface CreateHandlerRegistryInput {
	commands: CommandModule[];
	events: EventModule[];
	features: FeatureModule[];
	logger: Logger;
	LL: TranslationFunctions;
}

export function createHandlerRegistry({ commands, events, features, logger, LL }: CreateHandlerRegistryInput): HandlerRegistry {
	const featureMap = new Map<string, FeatureModule>();
	const commandMap = new Map<string, CommandModule>();
	const applicationCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

	for (const feature of features) {
		if (featureMap.has(feature.key)) {
			throw new Error(`Duplicate feature key "${feature.key}" detected.`);
		}

		featureMap.set(feature.key, feature);
	}

	for (const command of commands) {
		const data = typeof command.data === "function" ? command.data(LL) : command.data;

		if (commandMap.has(data.name)) {
			throw new Error(`Duplicate slash command "${data.name}" detected.`);
		}

		commandMap.set(data.name, {
			...command,
			data
		});
		applicationCommands.push(data);
	}

	logger.info(`Registered ${featureMap.size} feature modules.`);

	return {
		events,
		features: featureMap,
		commands: commandMap,
		applicationCommands
	};
}

export function registerEvents(app: BotApp) {
	const eventClient = app.client as unknown as {
		on(name: never, listener: (...args: unknown[]) => void): void;
		once(name: never, listener: (...args: unknown[]) => void): void;
	};

	for (const event of app.registry.events) {
		const listener = (...args: unknown[]) => {
			void (async () => {
				try {
					await event.execute(app, ...args);
				} catch (error) {
					app.logger.error(`Event "${event.name}" failed.`, error);
				}
			})();
		};

		if (event.once) {
			eventClient.once(event.name as never, listener);
			continue;
		}

		eventClient.on(event.name as never, listener);
	}
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

import type { Logger } from "@/core/logger";
import type { BotApp, EventModule, FeatureModule, HandlerRegistry, RegisteredCommand } from "@/core/types";

interface CreateHandlerRegistryInput {
	events: EventModule[];
	features: FeatureModule[];
	logger: Logger;
}

export function createHandlerRegistry({ events, features, logger }: CreateHandlerRegistryInput): HandlerRegistry {
	const featureMap = new Map<string, FeatureModule>();
	const commandMap = new Map<string, RegisteredCommand>();

	for (const feature of features) {
		if (featureMap.has(feature.key)) {
			throw new Error(`Duplicate feature key "${feature.key}" detected.`);
		}

		featureMap.set(feature.key, feature);

		for (const command of feature.commands ?? []) {
			if (commandMap.has(command.data.name)) {
				throw new Error(`Duplicate slash command "${command.data.name}" detected.`);
			}

			commandMap.set(command.data.name, {
				command,
				feature
			});
		}
	}

	logger.info(`Registered ${featureMap.size} feature modules.`);

	return {
		events,
		features: featureMap,
		commands: commandMap,
		applicationCommands: [...commandMap.values()].map(({ command }) => command.data)
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

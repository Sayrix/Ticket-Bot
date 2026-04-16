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

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Logger } from "@/core/logger";
import type { CommandModule, EventModule, FeatureModule } from "@/core/types";

const srcDirectory = fileURLToPath(new URL("..", import.meta.url));
const featuresDirectory = join(srcDirectory, "features");
const eventsDirectory = join(srcDirectory, "events");

function isCommandModule(value: unknown): value is CommandModule {
	return (
		typeof value === "object" &&
		value !== null &&
		"data" in value &&
		typeof value.data === "object" &&
		value.data !== null &&
		"name" in value.data &&
		typeof value.data.name === "string" &&
		"execute" in value &&
		typeof value.execute === "function"
	);
}

function isFeatureModule(value: unknown): value is FeatureModule {
	return typeof value === "object" && value !== null && "key" in value && typeof value.key === "string";
}

function isEventModule(value: unknown): value is EventModule {
	return (
		typeof value === "object" &&
		value !== null &&
		"name" in value &&
		typeof value.name === "string" &&
		"execute" in value &&
		typeof value.execute === "function"
	);
}

function isModuleFile(filePath: string) {
	return filePath.endsWith(".ts") || filePath.endsWith(".js");
}

async function walkFiles(rootDirectory: string): Promise<string[]> {
	const entries = await readdir(rootDirectory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const absolutePath = join(rootDirectory, entry.name);

			if (entry.isDirectory()) {
				return walkFiles(absolutePath);
			}

			return [absolutePath];
		})
	);

	return files.flat();
}

async function importModules<TModule>(
	directory: string,
	matcher: (filePath: string) => boolean,
	guard: (value: unknown) => value is TModule,
	logger: Logger,
	label: string
): Promise<TModule[]> {
	const filePaths = (await walkFiles(directory)).filter(matcher).sort();
	const loadedModules: TModule[] = [];

	for (const filePath of filePaths) {
		const importedModule = await import(pathToFileURL(filePath).href);
		const exportedValues = importedModule.default === undefined ? Object.values(importedModule) : [importedModule.default];

		for (const exportedValue of exportedValues) {
			if (!guard(exportedValue)) {
				continue;
			}

			loadedModules.push(exportedValue);
		}
	}

	logger.info(`Discovered ${loadedModules.length} ${label}.`);

	return loadedModules;
}

export async function discoverFeatures(logger: Logger) {
	return importModules(
		featuresDirectory,
		(filePath) => isModuleFile(filePath) && (filePath.endsWith("feature.ts") || filePath.endsWith("feature.js")),
		isFeatureModule,
		logger,
		"features"
	);
}

export async function discoverCommands(logger: Logger) {
	return importModules(
		featuresDirectory,
		(filePath) => isModuleFile(filePath) && (filePath.endsWith("command.ts") || filePath.endsWith("command.js")),
		isCommandModule,
		logger,
		"commands"
	);
}

export async function discoverEvents(logger: Logger) {
	return importModules(
		eventsDirectory,
		(filePath) => isModuleFile(filePath) && !filePath.endsWith("index.ts") && !filePath.endsWith("index.js"),
		isEventModule,
		logger,
		"events"
	);
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

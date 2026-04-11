import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Logger } from "@/core/logger";
import type { EventModule, FeatureModule } from "@/core/types";

const srcDirectory = fileURLToPath(new URL("..", import.meta.url));
const featuresDirectory = join(srcDirectory, "features");
const eventsDirectory = join(srcDirectory, "events");

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

export async function discoverEvents(logger: Logger) {
	return importModules(
		eventsDirectory,
		(filePath) => isModuleFile(filePath) && !filePath.endsWith("index.ts") && !filePath.endsWith("index.js"),
		isEventModule,
		logger,
		"events"
	);
}

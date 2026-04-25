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

import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs as parseNodeArgs } from "node:util";
import { parse as parseJsonc, type ParseError, printParseErrorCode } from "jsonc-parser";

interface CliOptions {
	source: string;
	output: string;
	overwrite: boolean;
	panelKey: string;
}

interface V3Config {
	clientId?: unknown;
	guildId?: unknown;
	lang?: unknown;
	openTicketChannelId?: unknown;
	ticketTypes?: unknown;
	ticketNameOption?: unknown;
	claimOption?: {
		claimButton?: unknown;
		nameWhenClaimed?: unknown;
		categoryWhenClaimed?: unknown;
	};
	rolesWhoHaveAccessToTheTickets?: unknown;
	rolesWhoCanNotCreateTickets?: unknown;
	pingRoleWhenOpened?: unknown;
	roleToPingWhenOpenedId?: unknown;
	logs?: unknown;
	logsChannelId?: unknown;
	closeOption?: {
		closeButton?: unknown;
		dmUser?: unknown;
		createTranscript?: unknown;
		askReason?: unknown;
		whoCanCloseTicket?: unknown;
		closeTicketCategoryId?: unknown;
	};
	uuidType?: unknown;
	status?: {
		enabled?: unknown;
		text?: unknown;
		type?: unknown;
		url?: unknown;
		status?: unknown;
	};
	maxTicketOpened?: unknown;
	minimalTracking?: unknown;
	showWSLog?: unknown;
}

interface V3TicketType {
	codeName?: unknown;
	name?: unknown;
	description?: unknown;
	emoji?: unknown;
	categoryId?: unknown;
	ticketNameOption?: unknown;
	customDescription?: unknown;
	cantAccess?: unknown;
	askQuestions?: unknown;
	questions?: unknown;
	staffRoles?: unknown;
}

interface V3Question {
	label?: unknown;
	placeholder?: unknown;
	style?: unknown;
	maxLength?: unknown;
}

interface MigrationSummary {
	source: string;
	output: string;
	ticketTypeKeys: string[];
	panelKey: string;
	warnings: string[];
}

interface CliValues {
	source?: string;
	output?: string;
	"panel-key"?: string;
	overwrite?: boolean;
	help?: boolean;
}

const DEFAULT_SOURCE = "config.jsonc";
const DEFAULT_OUTPUT = "config/config.ts";
const DEFAULT_PANEL_KEY = "support";
const SUPPORTED_LOCALES = new Set(["en", "fr"]);

runFromCli().catch((error) => {
	console.error(`[migrate:v3:config] ${error instanceof Error ? error.message : String(error)}`);
	process.exit(1);
});

async function runFromCli() {
	const options = parseArgs(process.argv.slice(2));

	if (!options) {
		printHelp();
		return;
	}

	const summary = await migrateV3Config(options);
	printSummary(summary);
}

async function migrateV3Config(options: CliOptions): Promise<MigrationSummary> {
	const sourcePath = path.resolve(options.source);
	const outputPath = path.resolve(options.output);

	if (!options.overwrite && (await fileExists(outputPath))) {
		throw new Error(`Output already exists: ${options.output}. Pass --overwrite to replace it.`);
	}

	const source = await readFile(sourcePath, "utf8");
	const warnings: string[] = [];
	const config = parseV3Jsonc(source) as V3Config;
	const migrated = migrateConfig(config, options.panelKey, warnings);
	const rendered = renderConfigFile(migrated);

	await writeFile(outputPath, rendered);

	return {
		source: options.source,
		output: options.output,
		ticketTypeKeys: Object.keys(migrated.ticketTypes),
		panelKey: options.panelKey,
		warnings
	};
}

function parseArgs(args: string[]): CliOptions | null {
	const { values } = parseNodeArgs({
		args,
		allowPositionals: false,
		options: {
			source: {
				type: "string",
				default: DEFAULT_SOURCE
			},
			output: {
				type: "string",
				default: DEFAULT_OUTPUT
			},
			"panel-key": {
				type: "string",
				default: DEFAULT_PANEL_KEY
			},
			overwrite: {
				type: "boolean",
				default: false
			},
			help: {
				type: "boolean",
				short: "h"
			}
		}
	}) as { values: CliValues };

	if (values.help) {
		return null;
	}

	return {
		source: values.source ?? DEFAULT_SOURCE,
		output: values.output ?? DEFAULT_OUTPUT,
		overwrite: values.overwrite ?? false,
		panelKey: values["panel-key"] ?? DEFAULT_PANEL_KEY
	};
}

function parseV3Jsonc(source: string) {
	const errors: ParseError[] = [];
	const parsed = parseJsonc(source, errors, {
		allowTrailingComma: true
	});

	if (errors.length > 0) {
		const firstError = errors[0];
		throw new Error(`Failed to parse v3 JSONC config: ${printParseErrorCode(firstError.error)} at offset ${firstError.offset}.`);
	}

	return parsed;
}

function migrateConfig(config: V3Config, panelKey: string, warnings: string[]) {
	const ticketTypes = readTicketTypes(config.ticketTypes).map((ticketType) => migrateTicketType(ticketType));
	const ticketTypeRecord = Object.fromEntries(ticketTypes.map((ticketType) => [ticketType.key, ticketType.value]));

	if (ticketTypes.length === 0) {
		throw new Error("The v3 config must contain at least one ticket type.");
	}

	const lang = migrateLocale(readOptionalString(config.lang), warnings);
	const mentionRoleIds = readOptionalBoolean(config.pingRoleWhenOpened, false)
		? readStringArray(config.roleToPingWhenOpenedId, "roleToPingWhenOpenedId")
		: [];

	return {
		clientId: readRequiredString(config.clientId, "clientId"),
		guildId: readRequiredString(config.guildId, "guildId"),
		lang,
		uuidType: readUuidType(config.uuidType),
		minimalTracking: readOptionalBoolean(config.minimalTracking, false),
		showWSLog: readOptionalBoolean(config.showWSLog, false),
		logs: {
			enabled: readOptionalBoolean(config.logs, false),
			channelId: readOptionalString(config.logsChannelId) ?? ""
		},
		status: migrateStatus(config.status),
		tickets: {
			channelNameTemplate: migrateTemplate(readOptionalString(config.ticketNameOption) || "ticket-{ticketNumber}"),
			maxOpenPerUser: readOptionalNumber(config.maxTicketOpened, 0),
			staffRoleIds: readStringArray(config.rolesWhoHaveAccessToTheTickets, "rolesWhoHaveAccessToTheTickets"),
			blockedRoleIds: readStringArray(config.rolesWhoCanNotCreateTickets, "rolesWhoCanNotCreateTickets"),
			mentionRoleIds,
			defaultWelcomeMessage: "tickets/ticket-opened",
			defaultWelcomeContent: "",
			claims: migrateClaims(config.claimOption),
			close: migrateClose(config.closeOption)
		},
		panels: {
			[panelKey]: {
				channelId: readRequiredString(config.openTicketChannelId, "openTicketChannelId"),
				message: "tickets/open-panel",
				content: "",
				opener: {
					type: "inline-select",
					ticketTypes: ticketTypes.map((ticketType) => ticketType.key),
					placeholder: "Open a ticket"
				}
			}
		},
		ticketTypes: ticketTypeRecord
	};
}

function readTicketTypes(value: unknown) {
	if (!Array.isArray(value)) {
		throw new Error("Expected ticketTypes to be an array.");
	}

	return value as V3TicketType[];
}

function migrateTicketType(ticketType: V3TicketType) {
	const key = readRequiredString(ticketType.codeName, "ticketTypes[].codeName");
	const migrated: Record<string, unknown> = {
		name: readRequiredString(ticketType.name, `ticketTypes.${key}.name`),
		description: readOptionalString(ticketType.description) ?? "",
		emoji: readOptionalString(ticketType.emoji) ?? undefined,
		categoryId: readRequiredString(ticketType.categoryId, `ticketTypes.${key}.categoryId`),
		channelNameTemplate: migrateTemplate(readOptionalString(ticketType.ticketNameOption) || "{ticketNumber}-ticket-{username}"),
		message: "tickets/ticket-opened",
		welcomeContent: migrateTemplate(readOptionalString(ticketType.customDescription) ?? ""),
		blockedRoleIds: readStringArray(ticketType.cantAccess, `ticketTypes.${key}.cantAccess`),
		staffRoleIds: readStringArray(ticketType.staffRoles, `ticketTypes.${key}.staffRoles`)
	};

	if (!migrated.emoji) {
		delete migrated.emoji;
	}

	if (readOptionalBoolean(ticketType.askQuestions, false)) {
		migrated.openForm = {
			title: `${migrated.name} Ticket`,
			questions: readQuestions(ticketType.questions, key)
		};
	}

	return {
		key,
		value: migrated
	};
}

function readQuestions(value: unknown, ticketTypeKey: string) {
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error(`ticketTypes.${ticketTypeKey} enables askQuestions but has no questions.`);
	}

	return (value as V3Question[]).map((question, index) => ({
		key: `reason${index + 1}`,
		label: readRequiredString(question.label, `ticketTypes.${ticketTypeKey}.questions.${index}.label`),
		placeholder: readOptionalString(question.placeholder) ?? undefined,
		style: migrateQuestionStyle(readOptionalString(question.style)),
		required: true,
		maxLength: readOptionalNumber(question.maxLength, 1000)
	}));
}

function migrateClaims(claimOption: V3Config["claimOption"]) {
	const claimButton = readOptionalBoolean(claimOption?.claimButton, false);
	const categoryWhenClaimed = readOptionalString(claimOption?.categoryWhenClaimed);

	return {
		enabled: claimButton,
		mode: "soft",
		showButtons: claimButton,
		allowUnclaim: true,
		nameWhenClaimed: migrateClaimTemplate(readOptionalString(claimOption?.nameWhenClaimed) || "{ticketNumber}-claimed-{claimerUsername}"),
		categoryWhenClaimed: categoryWhenClaimed || undefined,
		takeoverMode: "staff",
		takeoverRoleIds: []
	};
}

function migrateClose(closeOption: V3Config["closeOption"]) {
	const closeTicketCategoryId = readOptionalString(closeOption?.closeTicketCategoryId);

	return {
		staffOnly: readOptionalString(closeOption?.whoCanCloseTicket) !== "EVERYONE",
		dmUserOnClose: readOptionalBoolean(closeOption?.dmUser, true),
		askForReason: readOptionalBoolean(closeOption?.askReason, true),
		showCloseButton: readOptionalBoolean(closeOption?.closeButton, true),
		deleteChannelOnClose: false,
		createTranscript: readOptionalBoolean(closeOption?.createTranscript, true),
		closeTicketCategoryId: closeTicketCategoryId || undefined,
		dmMessage: "tickets/ticket-closed-dm",
		channelMessage: "tickets/ticket-closed"
	};
}

function migrateStatus(status: V3Config["status"]) {
	if (!status) {
		return {
			enabled: false,
			status: "online"
		};
	}

	return {
		enabled: readOptionalBoolean(status.enabled, false),
		text: readOptionalString(status.text) ?? undefined,
		type: migrateStatusType(readOptionalString(status.type)),
		url: readOptionalString(status.url) ?? undefined,
		status: migrateStatusValue(readOptionalString(status.status))
	};
}

function migrateLocale(value: string | undefined, warnings: string[]) {
	if (!value || value === "main") {
		return "en";
	}

	if (SUPPORTED_LOCALES.has(value)) {
		return value;
	}

	warnings.push(`Unsupported v3 lang "${value}" was migrated to "en".`);
	return "en";
}

function migrateStatusType(value: string | undefined) {
	const allowed = new Set(["PLAYING", "STREAMING", "LISTENING", "WATCHING", "CUSTOM", "COMPETING"]);
	return value && allowed.has(value) ? value : "PLAYING";
}

function migrateStatusValue(value: string | undefined) {
	const allowed = new Set(["online", "idle", "dnd", "invisible"]);
	return value && allowed.has(value) ? value : "online";
}

function readUuidType(value: unknown) {
	return value === "emoji" ? "emoji" : "uuid";
}

function migrateQuestionStyle(value: string | undefined) {
	return value === "PARAGRAPH" || value === "paragraph" ? "paragraph" : "short";
}

function migrateTemplate(value: string) {
	return value
		.replaceAll("TICKETCOUNT", "{ticketNumber}")
		.replaceAll("CATEGORYNAME", "{ticketTypeName}")
		.replaceAll("USERNAME", "{username}")
		.replaceAll("USERID", "{userId}")
		.replace(/\bREASON(\d+)\b/gu, "{reason$1}")
		.replace(/\bREASON\b/gu, "{reason}");
}

function migrateClaimTemplate(value: string) {
	return migrateTemplate(value.replaceAll("X_USERNAME", "{claimerUsername}").replaceAll("X_USERID", "{claimerId}"));
}

function readRequiredString(value: unknown, label: string) {
	const stringValue = readOptionalString(value);

	if (stringValue === undefined) {
		throw new Error(`Missing required string value: ${label}.`);
	}

	return stringValue;
}

function readOptionalString(value: unknown) {
	return typeof value === "string" ? value : undefined;
}

function readOptionalBoolean(value: unknown, fallback: boolean) {
	return typeof value === "boolean" ? value : fallback;
}

function readOptionalNumber(value: unknown, fallback: number) {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readStringArray(value: unknown, label: string) {
	if (value === undefined) {
		return [];
	}

	if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
		throw new Error(`Expected ${label} to be an array of strings.`);
	}

	return value;
}

function renderConfigFile(config: ReturnType<typeof migrateConfig>) {
	return `${licenseHeader()}import { defineConfig } from "@/config/index.js";

export default defineConfig("0.0.1", ${formatValue(config, 0)});
${licenseHeader()}`;
}

function formatValue(value: unknown, depth: number): string {
	if (value === undefined) {
		return "undefined";
	}

	if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
		return JSON.stringify(value);
	}

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return "[]";
		}

		const entries = value.map((entry) => `${indent(depth + 1)}${formatValue(entry, depth + 1)}`);
		return `[\n${entries.join(",\n")}\n${indent(depth)}]`;
	}

	if (typeof value === "object") {
		const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);

		if (entries.length === 0) {
			return "{}";
		}

		return `{\n${entries
			.map(([key, entry]) => `${indent(depth + 1)}${formatKey(key)}: ${formatValue(entry, depth + 1)}`)
			.join(",\n")}\n${indent(depth)}}`;
	}

	throw new Error(`Unsupported config value type: ${typeof value}.`);
}

function formatKey(key: string) {
	return /^[A-Za-z_$][\w$]*$/u.test(key) ? key : JSON.stringify(key);
}

function indent(depth: number) {
	return "\t".repeat(depth);
}

async function fileExists(filePath: string) {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

function printSummary(summary: MigrationSummary) {
	console.log("[migrate:v3:config] Config migration complete.");
	console.log(`  Source: ${summary.source}`);
	console.log(`  Output: ${summary.output}`);
	console.log(`  Panel key: ${summary.panelKey}`);
	console.log(`  Ticket types: ${summary.ticketTypeKeys.join(", ")}`);

	for (const warning of summary.warnings) {
		console.warn(`  Warning: ${warning}`);
	}
}

function printHelp() {
	console.log(`
Usage:
  bun run migrate:v3:config -- --source config.jsonc --output config/config.ts
  bun run migrate:v3:config -- --source config.jsonc --output .data/config.v4.ts

Options:
  --source <path>      v3 JSONC config path. Defaults to config.jsonc.
  --output <path>      v4 TypeScript config path. Defaults to config/config.ts.
  --panel-key <key>    v4 panel key created from openTicketChannelId. Defaults to support.
  --overwrite          Replace the output file if it already exists.
  --help               Show this help.
`.trim());
}

function licenseHeader() {
	return `/*
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

`;
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

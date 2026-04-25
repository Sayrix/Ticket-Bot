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

import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs as parseNodeArgs } from "node:util";
import { createClient, type Client, type InStatement, type InValue, type Row, type Value } from "@libsql/client/sqlite3";
import { config as loadEnv } from "dotenv";
import botConfig from "../config/config.js";

interface CliOptions {
	source: string;
	target: string;
	overwrite: boolean;
	panelKey?: string;
	typeMap: Map<string, string>;
}

interface V3TicketRow {
	id: number;
	channelId: string;
	creationMessageId: string;
	type: string;
	reason: string | null;
	createdBy: string;
	createdAt: number;
	claimedAt: number | null;
	claimedBy: string | null;
	invitedUserIds: string;
	closedAt: number | null;
	closedBy: string | null;
	closedReason: string | null;
	transcriptUrl: string | null;
}

interface PanelMigration {
	row?: {
		panelKey: string;
		channelId: string;
		messageId: string;
	};
	skippedReason?: string;
}

interface MigrationSummary {
	source: string;
	target: string;
	ticketsMigrated: number;
	panelMigration: PanelMigration;
	typeMap: Map<string, string>;
	overwrite: boolean;
}

interface CliValues {
	source?: string;
	target?: string;
	"panel-key"?: string;
	"type-map"?: string[];
	overwrite?: boolean;
	help?: boolean;
}

const CREATE_TICKETS_TABLE = `
CREATE TABLE IF NOT EXISTS tickets (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	channelId TEXT NOT NULL UNIQUE,
	creationMessageId TEXT NOT NULL UNIQUE,
	type TEXT NOT NULL,
	reason TEXT,
	createdBy TEXT NOT NULL,
	createdAt INTEGER NOT NULL,
	claimedAt INTEGER,
	claimedBy TEXT,
	invitedUserIds TEXT NOT NULL DEFAULT '[]',
	closedAt INTEGER,
	closedBy TEXT,
	closedReason TEXT,
	transcriptUrl TEXT
)`;

const CREATE_PANEL_MESSAGES_TABLE = `
CREATE TABLE IF NOT EXISTS panel_messages (
	panelKey TEXT PRIMARY KEY,
	channelId TEXT NOT NULL,
	messageId TEXT NOT NULL,
	updatedAt INTEGER NOT NULL
)`;

const CREATE_APP_META_TABLE = `
CREATE TABLE IF NOT EXISTS app_meta (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL,
	updatedAt INTEGER NOT NULL
)`;

loadEnv({ path: "./config/.env", quiet: true });

runFromCli().catch((error) => {
	console.error(`[migrate:v3] ${error instanceof Error ? error.message : String(error)}`);
	process.exit(1);
});

async function runFromCli() {
	const options = parseArgs(process.argv.slice(2));

	if (!options) {
		printHelp();
		return;
	}

	const summary = await migrateV3Database(options);
	printSummary(summary);
}

async function migrateV3Database(options: CliOptions): Promise<MigrationSummary> {
	const sourceUrl = normalizeSqliteUrl(options.source, "source");
	const targetUrl = normalizeSqliteUrl(options.target, "target");

	await assertSourceFileExists(sourceUrl);
	validatePanelKey(options.panelKey);
	validateTypeMapTargets(options.typeMap);

	const source = createClient({ url: sourceUrl });
	const target = createClient({ url: targetUrl });

	try {
		await assertV3SourceSchema(source);

		const tickets = await readV3Tickets(source, options.typeMap);
		const panelMigration = await preparePanelMigration(source, options.panelKey);

		await ensureV4Schema(target);
		await assertTargetCanBeUsed(target, options.overwrite);
		await writeV4Data(target, tickets, panelMigration, options.overwrite);

		return {
			source: sourceUrl,
			target: targetUrl,
			ticketsMigrated: tickets.length,
			panelMigration,
			typeMap: options.typeMap,
			overwrite: options.overwrite
		};
	} finally {
		source.close();
		target.close();
	}
}

function parseArgs(args: string[]): CliOptions | null {
	const { values } = parseNodeArgs({
		args,
		allowPositionals: false,
		options: {
			source: {
				type: "string"
			},
			target: {
				type: "string"
			},
			"panel-key": {
				type: "string"
			},
			"type-map": {
				type: "string",
				multiple: true
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

	if (!values.source) {
		throw new Error("Missing required --source option.");
	}

	const target = values.target ?? process.env.DB_FILE_NAME;

	if (!target) {
		throw new Error("Missing target database. Set DB_FILE_NAME in config/.env or pass --target.");
	}

	return {
		source: values.source,
		target,
		overwrite: values.overwrite ?? false,
		panelKey: values["panel-key"],
		typeMap: parseTypeMap(values["type-map"] ?? [])
	};
}

function parseTypeMap(mappings: string[]) {
	const typeMap = new Map<string, string>();

	for (const mapping of mappings) {
		const separatorIndex = mapping.indexOf("=");

		if (separatorIndex <= 0 || separatorIndex === mapping.length - 1) {
			throw new Error(`Invalid --type-map "${mapping}". Expected oldKey=newKey.`);
		}

		typeMap.set(mapping.slice(0, separatorIndex), mapping.slice(separatorIndex + 1));
	}

	return typeMap;
}

function normalizeSqliteUrl(value: string, label: "source" | "target") {
	const trimmed = value.trim();

	if (!trimmed) {
		throw new Error(`The ${label} database URL is empty.`);
	}

	if (/^[a-z][a-z0-9+.-]*:/iu.test(trimmed)) {
		if (!trimmed.startsWith("file:")) {
			throw new Error(`The ${label} database must be a local SQLite file URL, for example file:.data/sqlite.db.`);
		}

		return trimmed;
	}

	return `file:${trimmed}`;
}

async function assertSourceFileExists(sourceUrl: string) {
	const sourcePath = localFilePath(sourceUrl);

	if (!sourcePath) {
		throw new Error("The v3 source database must be a local SQLite file URL, for example file:./tixbot.db.");
	}

	try {
		await access(sourcePath);
	} catch {
		throw new Error(`Source database file does not exist: ${sourcePath}`);
	}
}

function localFilePath(databaseUrl: string) {
	if (!databaseUrl.startsWith("file:")) {
		return null;
	}

	const value = databaseUrl.slice("file:".length);

	if (value.startsWith("//")) {
		return fileURLToPath(databaseUrl);
	}

	return path.resolve(value);
}

function validatePanelKey(panelKey: string | undefined) {
	if (!panelKey) {
		return;
	}

	if (!Object.hasOwn(botConfig.panels, panelKey)) {
		throw new Error(`Unknown v4 panel key "${panelKey}". Check config/config.ts.`);
	}
}

function validateTypeMapTargets(typeMap: Map<string, string>) {
	for (const [oldKey, newKey] of typeMap) {
		if (!Object.hasOwn(botConfig.ticketTypes, newKey)) {
			throw new Error(`Invalid --type-map ${oldKey}=${newKey}. The target v4 ticket type does not exist.`);
		}
	}
}

async function assertV3SourceSchema(source: Client) {
	if (!(await tableExists(source, "tickets"))) {
		throw new Error('The source database does not contain a v3 "tickets" table.');
	}
}

async function tableExists(client: Client, tableName: string) {
	const result = await client.execute({
		sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
		args: [tableName]
	});

	return result.rows.length > 0;
}

async function readV3Tickets(source: Client, typeMap: Map<string, string>) {
	const result = await source.execute(`
		SELECT
			id,
			channelid,
			messageid,
			category,
			invited,
			reason,
			creator,
			createdat,
			claimedby,
			claimedat,
			closedby,
			closedat,
			closereason,
			transcript
		FROM tickets
		ORDER BY id ASC
	`);

	return result.rows.map((row) => mapV3Ticket(row, typeMap));
}

function mapV3Ticket(row: Row, typeMap: Map<string, string>): V3TicketRow {
	const rawType = readTicketType(row);
	const mappedType = typeMap.get(rawType) ?? rawType;

	if (!Object.hasOwn(botConfig.ticketTypes, mappedType)) {
		throw new Error(
			`Unknown v3 ticket type "${rawType}" for ticket ${readInteger(row, "id")}. ` +
				`Add a matching v4 ticketTypes entry or pass --type-map ${rawType}=<v4Key>.`
		);
	}

	return {
		id: readInteger(row, "id"),
		channelId: readText(row, "channelid"),
		creationMessageId: readText(row, "messageid"),
		type: mappedType,
		reason: readOptionalText(row, "reason"),
		createdBy: readText(row, "creator"),
		createdAt: readInteger(row, "createdat"),
		claimedAt: readOptionalInteger(row, "claimedat"),
		claimedBy: readOptionalText(row, "claimedby"),
		invitedUserIds: readInvitedUserIds(row),
		closedAt: readOptionalInteger(row, "closedat"),
		closedBy: readOptionalText(row, "closedby"),
		closedReason: readOptionalText(row, "closereason"),
		transcriptUrl: readOptionalText(row, "transcript")
	};
}

function readTicketType(row: Row) {
	const category = readText(row, "category");
	let parsed: unknown;

	try {
		parsed = JSON.parse(category);
	} catch {
		throw new Error(`Ticket ${readInteger(row, "id")} has invalid category JSON.`);
	}

	if (!parsed || typeof parsed !== "object" || !("codeName" in parsed) || typeof parsed.codeName !== "string") {
		throw new Error(`Ticket ${readInteger(row, "id")} category JSON does not contain a string codeName.`);
	}

	return parsed.codeName;
}

function readInvitedUserIds(row: Row) {
	const invited = readOptionalText(row, "invited") ?? "[]";
	let parsed: unknown;

	try {
		parsed = JSON.parse(invited);
	} catch {
		throw new Error(`Ticket ${readInteger(row, "id")} has invalid invited JSON.`);
	}

	if (!Array.isArray(parsed) || !parsed.every((entry) => typeof entry === "string")) {
		throw new Error(`Ticket ${readInteger(row, "id")} invited value must be a JSON array of strings.`);
	}

	return JSON.stringify(parsed);
}

async function preparePanelMigration(source: Client, requestedPanelKey: string | undefined): Promise<PanelMigration> {
	const openTicketMessageId = await readOpenTicketMessageId(source);

	if (!openTicketMessageId) {
		return {
			skippedReason: 'v3 config.openTicketMessageId was not found.'
		};
	}

	const panelKeys = Object.keys(botConfig.panels);
	const panelKey = requestedPanelKey ?? (panelKeys.length === 1 ? panelKeys[0] : undefined);

	if (!panelKey) {
		return {
			skippedReason:
				panelKeys.length === 0
					? "config/config.ts does not define any v4 panels."
					: "config/config.ts defines multiple v4 panels; pass --panel-key to choose one."
		};
	}

	const panel = botConfig.panels[panelKey];

	return {
		row: {
			panelKey,
			channelId: panel.channelId,
			messageId: openTicketMessageId
		}
	};
}

async function readOpenTicketMessageId(source: Client) {
	if (!(await tableExists(source, "config"))) {
		return null;
	}

	const result = await source.execute({
		sql: "SELECT value FROM config WHERE key = ? LIMIT 1",
		args: ["openTicketMessageId"]
	});
	const row = result.rows[0];

	if (!row) {
		return null;
	}

	return readOptionalText(row, "value");
}

async function ensureV4Schema(target: Client) {
	await target.batch([CREATE_TICKETS_TABLE, CREATE_PANEL_MESSAGES_TABLE, CREATE_APP_META_TABLE], "write");
}

async function assertTargetCanBeUsed(target: Client, overwrite: boolean) {
	if (overwrite) {
		return;
	}

	const ticketCount = await countRows(target, "tickets");
	const panelMessageCount = await countRows(target, "panel_messages");

	if (ticketCount > 0 || panelMessageCount > 0) {
		throw new Error(
			`Target database already contains ${ticketCount} ticket row(s) and ${panelMessageCount} panel row(s). ` +
				"Pass --overwrite to clear those v4 tables before migrating."
		);
	}
}

async function countRows(client: Client, tableName: "tickets" | "panel_messages") {
	const result = await client.execute(`SELECT COUNT(*) AS count FROM ${tableName}`);
	const count = result.rows[0]?.count;

	return Number(count ?? 0);
}

async function writeV4Data(target: Client, tickets: V3TicketRow[], panelMigration: PanelMigration, overwrite: boolean) {
	const statements: InStatement[] = [];

	if (overwrite) {
		statements.push("DELETE FROM tickets", "DELETE FROM panel_messages");
	}

	for (const ticket of tickets) {
		statements.push({
			sql: `
				INSERT INTO tickets (
					id,
					channelId,
					creationMessageId,
					type,
					reason,
					createdBy,
					createdAt,
					claimedAt,
					claimedBy,
					invitedUserIds,
					closedAt,
					closedBy,
					closedReason,
					transcriptUrl
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`,
			args: [
				ticket.id,
				ticket.channelId,
				ticket.creationMessageId,
				ticket.type,
				ticket.reason,
				ticket.createdBy,
				ticket.createdAt,
				ticket.claimedAt,
				ticket.claimedBy,
				ticket.invitedUserIds,
				ticket.closedAt,
				ticket.closedBy,
				ticket.closedReason,
				ticket.transcriptUrl
			] satisfies InValue[]
		});
	}

	if (panelMigration.row) {
		statements.push({
			sql: `
				INSERT INTO panel_messages (panelKey, channelId, messageId, updatedAt)
				VALUES (?, ?, ?, ?)
			`,
			args: [panelMigration.row.panelKey, panelMigration.row.channelId, panelMigration.row.messageId, Date.now()]
		});
	}

	if (statements.length > 0) {
		await target.batch(statements, "write");
	}
}

function readText(row: Row, column: string) {
	const value = readValue(row, column);

	if (typeof value !== "string") {
		throw new Error(`Expected "${column}" to be text.`);
	}

	return value;
}

function readOptionalText(row: Row, column: string) {
	const value = readValue(row, column);

	if (value === null || value === undefined) {
		return null;
	}

	if (typeof value !== "string") {
		throw new Error(`Expected "${column}" to be text or null.`);
	}

	return value;
}

function readInteger(row: Row, column: string) {
	const value = readValue(row, column);
	const numberValue = valueToNumber(value, column);

	if (!Number.isSafeInteger(numberValue)) {
		throw new Error(`Expected "${column}" to be a safe integer.`);
	}

	return numberValue;
}

function readOptionalInteger(row: Row, column: string) {
	const value = readValue(row, column);

	if (value === null || value === undefined) {
		return null;
	}

	const numberValue = valueToNumber(value, column);

	if (!Number.isSafeInteger(numberValue)) {
		throw new Error(`Expected "${column}" to be a safe integer or null.`);
	}

	return numberValue;
}

function valueToNumber(value: Value | undefined, column: string) {
	if (typeof value === "number") {
		return value;
	}

	if (typeof value === "bigint") {
		return Number(value);
	}

	if (typeof value === "string" && /^-?\d+$/u.test(value)) {
		return Number(value);
	}

	throw new Error(`Expected "${column}" to be an integer.`);
}

function readValue(row: Row, column: string) {
	return row[column] as Value | undefined;
}

function printSummary(summary: MigrationSummary) {
	console.log("[migrate:v3] Migration complete.");
	console.log(`  Source: ${summary.source}`);
	console.log(`  Target: ${summary.target}`);
	console.log(`  Tickets migrated: ${summary.ticketsMigrated}`);

	if (summary.panelMigration.row) {
		console.log(`  Panel migrated: ${summary.panelMigration.row.panelKey}`);
	} else {
		console.log(`  Panel skipped: ${summary.panelMigration.skippedReason ?? "not requested"}`);
	}

	if (summary.typeMap.size > 0) {
		console.log(`  Type map: ${[...summary.typeMap].map(([oldKey, newKey]) => `${oldKey}=${newKey}`).join(", ")}`);
	} else {
		console.log("  Type map: none");
	}

	console.log(`  Overwrite: ${summary.overwrite ? "yes" : "no"}`);
}

function printHelp() {
	console.log(`
Usage:
  bun run migrate:v3 -- --source file:./tixbot.db
  bun run migrate:v3 -- --source file:./tixbot.db --target file:.data/sqlite.db

Options:
  --source <url>          Required v3 SQLite database file.
  --target <url>          v4 database. Defaults to DB_FILE_NAME from config/.env.
  --panel-key <key>       v4 panel key for the old open ticket message.
  --type-map old=new      Map a v3 ticket type codeName to a v4 ticketTypes key. Can be repeated.
  --overwrite             Clear v4 tickets and panel_messages before importing.
  --help                  Show this help.
`.trim());
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

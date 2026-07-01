import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@libsql/client/sqlite3";

const rootDirectory = fileURLToPath(new URL("..", import.meta.url));
const fixtureDirectory = path.join(rootDirectory, ".data");

await mkdir(fixtureDirectory, { recursive: true });
await run(process.execPath, ["run", "build"]);

const configModule = await import(pathToFileURL(path.join(rootDirectory, "dist", "config", "config.js")).href);
const config = configModule.default;
const validTypeKey = Object.keys(config.ticketTypes)[0];
const firstPanelKey = Object.keys(config.panels)[0];

if (!validTypeKey) {
	throw new Error("config/config.ts must define at least one ticket type for migration verification.");
}

await verifyBasicMigration();
await verifyTypeMap();
await verifyUnknownTypeFailure();
await verifyTargetConflictFailure();
await verifyConfigMigration();

console.log("[migrate:v3:test] All migration fixture checks passed.");

async function verifyBasicMigration() {
	const sourceUrl = await resetFixture("migrate-v3-basic-source.db");
	const targetUrl = await resetFixture("migrate-v3-basic-target.db");

	await createV3Database(sourceUrl, validTypeKey, { includePanelMessage: Boolean(firstPanelKey) });
	await runMigration(["--source", sourceUrl, "--target", targetUrl, ...(firstPanelKey ? ["--panel-key", firstPanelKey] : [])]);

	await withClient(targetUrl, async (target) => {
		const tickets = await target.execute("SELECT * FROM tickets ORDER BY id ASC");
		assert(tickets.rows.length === 2, "basic migration should copy two tickets.");
		assert(Number(tickets.rows[0].id) === 10, "basic migration should preserve ticket IDs.");
		assert(tickets.rows[0].type === validTypeKey, "basic migration should map category.codeName to type.");
		assert(tickets.rows[0].claimedAt === null, "basic migration should preserve nullable claimedAt.");
		assert(tickets.rows[1].claimedBy === "222222222222222222", "basic migration should copy claimedBy.");
		assert(tickets.rows[1].closedReason === "Done", "basic migration should copy close reasons.");
		assert(tickets.rows[1].transcriptUrl === "https://ticket.pm/transcript/abc", "basic migration should copy transcript URLs.");
		assert(
			tickets.rows[0].invitedUserIds === JSON.stringify(["333333333333333333"]),
			"basic migration should copy invited users."
		);

		if (firstPanelKey) {
			const panels = await target.execute("SELECT * FROM panel_messages");
			assert(panels.rows.length === 1, "basic migration should copy the open panel message.");
			assert(panels.rows[0].panelKey === firstPanelKey, "basic migration should use the requested panel key.");
			assert(panels.rows[0].messageId === "999999999999999999", "basic migration should copy openTicketMessageId.");
		}
	});

	console.log("[migrate:v3:test] basic migration passed.");
}

async function verifyTypeMap() {
	const sourceUrl = await resetFixture("migrate-v3-type-map-source.db");
	const targetUrl = await resetFixture("migrate-v3-type-map-target.db");

	await createV3Database(sourceUrl, "old-support", { includePanelMessage: false });
	await runMigration(["--source", sourceUrl, "--target", targetUrl, "--type-map", `old-support=${validTypeKey}`]);

	await withClient(targetUrl, async (target) => {
		const tickets = await target.execute("SELECT type FROM tickets LIMIT 1");
		assert(tickets.rows[0]?.type === validTypeKey, "type map should rewrite old codeName values.");
	});

	console.log("[migrate:v3:test] type map migration passed.");
}

async function verifyUnknownTypeFailure() {
	const sourceUrl = await resetFixture("migrate-v3-unknown-source.db");
	const targetUrl = await resetFixture("migrate-v3-unknown-target.db");

	await createV3Database(sourceUrl, "missing-type", { includePanelMessage: false });
	const result = await runMigration(["--source", sourceUrl, "--target", targetUrl], { expectFailure: true });

	assertIncludes(result.stderr, 'Unknown v3 ticket type "missing-type"', "unknown type should fail with a useful error.");
	console.log("[migrate:v3:test] unknown type failure passed.");
}

async function verifyTargetConflictFailure() {
	const sourceUrl = await resetFixture("migrate-v3-conflict-source.db");
	const targetUrl = await resetFixture("migrate-v3-conflict-target.db");

	await createV3Database(sourceUrl, validTypeKey, { includePanelMessage: false });

	await withClient(targetUrl, async (target) => {
		await target.batch(["CREATE TABLE tickets (id INTEGER)", "INSERT INTO tickets (id) VALUES (1)"], "write");
	});

	const result = await runMigration(["--source", sourceUrl, "--target", targetUrl], { expectFailure: true });

	assertIncludes(result.stderr, "Target database already contains", "target conflict should fail before import.");
	console.log("[migrate:v3:test] target conflict failure passed.");
}

async function verifyConfigMigration() {
	const sourcePath = path.join(fixtureDirectory, "migrate-v3-config-source.jsonc");
	const outputPath = path.join(fixtureDirectory, "migrate-v3-config-output.ts");

	await rm(sourcePath, { force: true });
	await rm(outputPath, { force: true });
	try {
		await writeFile(
			sourcePath,
			`{
			"clientId": "123",
			"guildId": "456",
			"lang": "main",
			"openTicketChannelId": "789",
			"ticketTypes": [
				{
					"codeName": "support",
					"name": "Support",
					"description": "Help",
					"emoji": "S",
					"categoryId": "111",
					"ticketNameOption": "support-TICKETCOUNT",
					"customDescription": "Reason: REASON1",
					"cantAccess": ["222"],
					"askQuestions": true,
					"questions": [
						{
							"label": "What happened?",
							"placeholder": "Explain",
							"style": "PARAGRAPH",
							"maxLength": 1000,
						},
					],
					"staffRoles": ["333"],
				},
			],
			"ticketNameOption": "Ticket-TICKETCOUNT",
			"claimOption": {
				"claimButton": true,
				"nameWhenClaimed": "Claimed-X_USERNAME-TICKETCOUNT",
				"categoryWhenClaimed": "444",
			},
			"rolesWhoHaveAccessToTheTickets": ["333"],
			"rolesWhoCanNotCreateTickets": ["555"],
			"pingRoleWhenOpened": true,
			"roleToPingWhenOpenedId": ["666"],
			"logs": true,
			"logsChannelId": "777",
			"closeOption": {
				"closeButton": true,
				"dmUser": true,
				"createTranscript": true,
				"askReason": false,
				"whoCanCloseTicket": "EVERYONE",
				"closeTicketCategoryId": "888",
			},
			"uuidType": "emoji",
			"status": {
				"enabled": true,
				"text": "github.com/Sayrix",
				"type": "WATCHING",
				"url": "",
				"status": "online",
			},
			"maxTicketOpened": 2,
			"minimalTracking": false,
			"showWSLog": true,
		}`
		);

		await run(process.execPath, [
			path.join(rootDirectory, "dist", "src", "migrate-v3-config.js"),
			"--source",
			sourcePath,
			"--output",
			outputPath,
			"--panel-key",
			"mainPanel"
		]);

		const generated = await readFile(outputPath, "utf8");

		assertGeneratedConfig(generated, [
			["mainPanel:", "config migration should use the requested panel key."],
			["support:", "config migration should preserve ticket type codeName keys."],
			['channelNameTemplate: "support-{ticketNumber}"', "config migration should convert ticket name tokens."],
			['welcomeContent: "Reason: {reason1}"', "config migration should convert reason tokens."],
			['nameWhenClaimed: "Claimed-{claimerUsername}-{ticketNumber}"', "config migration should convert claim tokens."],
			["staffOnly: false", "config migration should convert EVERYONE close mode."]
		]);

		console.log("[migrate:v3:test] config migration passed.");
	} finally {
		await rm(sourcePath, { force: true });
		await rm(outputPath, { force: true });
	}
}

async function createV3Database(databaseUrl, ticketTypeKey, options) {
	await withClient(databaseUrl, async (client) => {
		await client.batch(
			[
				"CREATE TABLE config (key TEXT PRIMARY KEY, value TEXT)",
				`
					CREATE TABLE tickets (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						channelid TEXT NOT NULL UNIQUE,
						messageid TEXT NOT NULL UNIQUE,
						category TEXT NOT NULL,
						invited TEXT NOT NULL DEFAULT '[]',
						reason TEXT NOT NULL,
						creator TEXT NOT NULL,
						createdat BIGINT NOT NULL,
						claimedby TEXT,
						claimedat BIGINT,
						closedby TEXT,
						closedat BIGINT,
						closereason TEXT,
						transcript TEXT
					)
				`,
				...(options.includePanelMessage
					? [
							{
								sql: "INSERT INTO config (key, value) VALUES (?, ?)",
								args: ["openTicketMessageId", "999999999999999999"]
							}
						]
					: []),
				{
					sql: `
						INSERT INTO tickets (
							id,
							channelid,
							messageid,
							category,
							invited,
							reason,
							creator,
							createdat
						)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?)
					`,
					args: [
						10,
						"111111111111111111",
						"111111111111111112",
						JSON.stringify({ codeName: ticketTypeKey }),
						JSON.stringify(["333333333333333333"]),
						"Need help",
						"111111111111111113",
						1710000000000
					]
				},
				{
					sql: `
						INSERT INTO tickets (
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
						)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					`,
					args: [
						11,
						"211111111111111111",
						"211111111111111112",
						JSON.stringify({ codeName: ticketTypeKey }),
						"[]",
						"Billing question",
						"211111111111111113",
						1710000001000,
						"222222222222222222",
						1710000002000,
						"222222222222222223",
						1710000003000,
						"Done",
						"https://ticket.pm/transcript/abc"
					]
				}
			],
			"write"
		);
	});
}

async function resetFixture(fileName) {
	const filePath = path.join(fixtureDirectory, fileName);
	await rm(filePath, { force: true });
	return `file:.data/${fileName}`;
}

async function runMigration(args, options = {}) {
	return run(process.execPath, [path.join(rootDirectory, "dist", "src", "migrate-v3-db.js"), ...args], options);
}

function run(command, args, options = {}) {
	return new Promise((resolvePromise, rejectPromise) => {
		const child = spawn(command, args, {
			cwd: rootDirectory,
			env: process.env,
			stdio: ["ignore", "pipe", "pipe"]
		});
		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (chunk) => {
			stdout += chunk.toString();
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk.toString();
		});
		child.on("error", rejectPromise);
		child.on("exit", (code) => {
			const failed = code !== 0;

			if (options.expectFailure ? failed : !failed) {
				resolvePromise({ stdout, stderr, code });
				return;
			}

			const output = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
			rejectPromise(new Error(`Command failed with exit code ${code ?? "unknown"}.\n${output}`));
		});
	});
}

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function assertIncludes(value, expected, message) {
	assert(value.includes(expected), message);
}

function assertGeneratedConfig(source, expectations) {
	for (const [expected, message] of expectations) {
		assertIncludes(source, expected, message);
	}
}

async function withClient(databaseUrl, fn) {
	const client = createClient({ url: databaseUrl });

	try {
		return await fn(client);
	} finally {
		client.close();
	}
}

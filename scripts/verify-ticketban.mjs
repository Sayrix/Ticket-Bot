import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ComponentType, PermissionFlagsBits } from "@discordjs/core";
import { createClient } from "@libsql/client/sqlite3";
import { drizzle } from "drizzle-orm/libsql";
import exampleConfig from "../config/config.example.ts";
import { createBotI18n } from "../src/core/i18n.ts";
import ticketban from "../src/features/commands/ticketban/command.ts";
import ticketunban from "../src/features/commands/ticketunban/command.ts";
import {
	canManageTicketBans,
	getActiveTicketBan,
	parseTicketBanDuration,
	removeTicketBan,
	setTicketBan
} from "../src/features/tickets/bans.ts";
import { continueTicketOpen, handleOpenFormSubmit } from "../src/features/tickets/ticket-workflow.ts";

const now = 1_800_000_000_000;
for (const input of [null, "lifetime", " PERMANENT "]) {
	assert.deepEqual(parseTicketBanDuration(input, now), { ok: true, expiresAt: null });
}
for (const [input, milliseconds] of [
	["30s", 30_000],
	["30m", 1_800_000],
	["2h", 7_200_000],
	["7d", 604_800_000],
	["1w", 604_800_000],
	["1d12h", 129_600_000],
	[" 1D 12H ", 129_600_000]
]) {
	assert.deepEqual(parseTicketBanDuration(input, now), { ok: true, expiresAt: now + milliseconds });
}
for (const input of ["", " ", "0s", "-1h", "1.5h", "7", "forever", "1month", "1h junk", "1 0h", "999999999999999999999w"]) {
	assert.deepEqual(parseTicketBanDuration(input, now), { ok: false }, input);
}

const root = fileURLToPath(new URL("..", import.meta.url));
await mkdir(path.join(root, ".data"), { recursive: true });
const fixture = process.argv[2] ?? (await mkdtemp(path.join(root, ".data", "ticketban-test-")));
assert(fixture.startsWith(`${path.join(root, ".data")}${path.sep}`));
if (!process.argv[2]) {
	try {
		// Windows retains native SQLite handles until process exit; clean up from the parent.
		const checked = spawnSync(process.execPath, [fileURLToPath(import.meta.url), fixture], {
			cwd: root,
			encoding: "utf8",
			timeout: 60_000
		});
		assert.equal(checked.status, 0, checked.stderr || checked.stdout);
		console.log(checked.stdout.trim());
	} finally {
		await rm(fixture, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
	}
	process.exit(0);
}
const databaseUrl = `file:${path.join(fixture, "fixture.db")}`;
let client;

try {
	// Run the real schema push only against this disposable fixture, never config/.env's database.
	const pushed = spawnSync(process.execPath, ["node_modules/drizzle-kit/bin.cjs", "push", "--force"], {
		cwd: root,
		env: { ...process.env, DB_FILE_NAME: databaseUrl },
		encoding: "utf8"
	});
	assert.equal(pushed.status, 0, pushed.stderr || pushed.stdout);
	client = createClient({ url: databaseUrl });
	const calls = [];
	const config = {
		...exampleConfig,
		guildId: "guild-1",
		ticketTypes: {
			test: {
				name: "Test",
				categoryId: "category-1",
				openForm: { title: "Test", questions: [{ key: "reason", label: "Reason" }] }
			}
		}
	};
	const app = {
		db: drizzle(client),
		config,
		applicationId: "app-1",
		LL: createBotI18n("en").LL,
		client: {
			api: {
				interactions: Object.fromEntries(
					["reply", "defer", "editReply", "followUp", "updateMessage", "createModal"].map((name) => [
						name,
						async (...args) => {
							calls.push({ name, body: args.at(-1) });
						}
					])
				),
				guilds: {
					createChannel: async () => {
						throw new Error("ticket creation reached");
					}
				}
			}
		}
	};
	const interaction = {
		id: "interaction-1",
		token: "test",
		guild_id: config.guildId,
		member: {
			permissions: PermissionFlagsBits.BanMembers.toString(),
			roles: [],
			user: { id: "moderator-1", username: "Moderator" }
		},
		data: { options: [{ name: "user", value: "user-1" }] }
	};
	assert(canManageTicketBans(app, interaction));
	assert(
		canManageTicketBans(app, {
			...interaction,
			member: { ...interaction.member, permissions: PermissionFlagsBits.Administrator.toString() }
		})
	);
	assert(!canManageTicketBans(app, { ...interaction, member: { ...interaction.member, permissions: "0" } }));
	assert(!canManageTicketBans(app, { ...interaction, guild_id: "other-guild" }));
	assert(!canManageTicketBans(app, { ...interaction, member: undefined, guild_id: undefined }));
	assert.equal(ticketban.data(app.LL).default_member_permissions, PermissionFlagsBits.BanMembers.toString());
	assert.equal(ticketunban.data(app.LL).default_member_permissions, PermissionFlagsBits.BanMembers.toString());

	await ticketban.execute({ app }, interaction);
	assert.equal((await getActiveTicketBan(app, "user-1")).expiresAt, null);
	assert.equal((await getActiveTicketBan(app, "user-1")).bannedBy, "moderator-1");
	assert.match(calls.at(-1).body.content, /for life/);
	await ticketban.execute(
		{ app },
		{ ...interaction, data: { options: [...interaction.data.options, { name: "duration", value: "2h" }] } }
	);
	const timed = await getActiveTicketBan(app, "user-1");
	assert(timed.expiresAt > Date.now() + 7_190_000);
	assert.match(calls.at(-1).body.content, /until <t:/);
	assert.equal(await getActiveTicketBan(app, "user-1", timed.expiresAt), null);
	assert(await getActiveTicketBan(app, "user-1", timed.expiresAt - 1));
	assert.equal(await getActiveTicketBan({ ...app, config: { ...config, guildId: "other-guild" } }, "user-1"), null);

	// Invalid or unauthorized commands must leave the existing ban untouched.
	await ticketban.execute(
		{ app },
		{ ...interaction, data: { options: [...interaction.data.options, { name: "duration", value: "0h" }] } }
	);
	await ticketban.execute({ app }, { ...interaction, member: { ...interaction.member, permissions: "0" } });
	assert.equal((await getActiveTicketBan(app, "user-1")).expiresAt, timed.expiresAt);
	await ticketunban.execute({ app }, { ...interaction, member: { ...interaction.member, permissions: "0" } });
	assert(await getActiveTicketBan(app, "user-1"));
	await ticketunban.execute({ app }, interaction);
	assert.equal(await getActiveTicketBan(app, "user-1"), null);
	await ticketunban.execute({ app }, interaction);
	assert.match(calls.at(-1).body.content, /no active ticket ban/);

	await setTicketBan(app, "user-1", "moderator-1", null);
	client.close();
	client = createClient({ url: databaseUrl });
	app.db = drizzle(client);
	assert.equal((await getActiveTicketBan(app, "user-1")).expiresAt, null, "lifetime bans survive reopening the database");
	const userInteraction = {
		...interaction,
		channel_id: "panel-channel",
		channel: { id: "panel-channel" },
		member: { ...interaction.member, permissions: "0", user: { id: "user-1", username: "User" } },
		data: { component_type: ComponentType.Button }
	};
	for (const componentType of [ComponentType.Button, ComponentType.StringSelect]) {
		calls.length = 0;
		await continueTicketOpen(app, { ...userInteraction, data: { component_type: componentType } }, { ticketTypeKey: "test" });
		assert.deepEqual(
			calls.map((call) => call.name),
			componentType === ComponentType.Button ? ["reply"] : ["updateMessage", "followUp"]
		);
		assert.match(calls.at(-1).body.content, /for life/);
	}
	const formInteraction = { ...userInteraction, data: { components: [] } };
	calls.length = 0;
	await handleOpenFormSubmit({ app, route: { state: ["test"] } }, formInteraction);
	assert.deepEqual(
		calls.map((call) => call.name),
		["defer", "editReply"]
	);
	assert.match(calls.at(-1).body.content, /for life/);

	await removeTicketBan(app, "user-1");
	calls.length = 0;
	await continueTicketOpen(app, userInteraction, { ticketTypeKey: "test" });
	assert.equal(calls.at(-1).name, "createModal", "unbanned users can open the form");
	await setTicketBan(app, "user-1", "moderator-1", Date.now() + 60_000);
	await handleOpenFormSubmit({ app, route: { state: ["test"] } }, formInteraction);
	assert.match(calls.at(-1).body.content, /until <t:/, "a form opened before the ban must be blocked on submit");
	await setTicketBan(app, "user-1", "moderator-1", Date.now() - 1);
	await assert.rejects(
		() => handleOpenFormSubmit({ app, route: { state: ["test"] } }, formInteraction),
		/ticket creation reached/
	);
	assert.equal(await removeTicketBan(app, "user-1"), false);

	// A select consumes its initial response; bans imposed during that update need a follow-up.
	delete config.ticketTypes.test.openForm;
	app.client.api.interactions.updateMessage = async () => {
		calls.push({ name: "updateMessage" });
		await setTicketBan(app, "user-1", "moderator-1", null);
	};
	calls.length = 0;
	await continueTicketOpen(
		app,
		{ ...userInteraction, data: { component_type: ComponentType.StringSelect } },
		{ ticketTypeKey: "test" }
	);
	assert.deepEqual(
		calls.map((call) => call.name),
		["updateMessage", "followUp"]
	);
	assert.match(calls.at(-1).body.content, /for life/);
	console.log("[ticketban:test] Duration, permissions, persistence, expiry, unban, panel and form checks passed.");
} finally {
	client?.close();
}

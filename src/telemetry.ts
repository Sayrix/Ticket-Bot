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

import os from "node:os";
import { eq } from "drizzle-orm";
import type { BotApp } from "@/core/types";
import { appMetaTable } from "@/db/schema";
import { BOT_VERSION } from "@/version";

const TELEMETRY_SOCKET_URL = "wss://telemetry.ticket.pm";
// const TELEMETRY_SOCKET_URL = "ws://localhost:45263";
const TELEMETRY_PROTOCOL_VERSION = "v1";
const TELEMETRY_SOCKET_PROTOCOL = `ticket.pm.telemetry.${TELEMETRY_PROTOCOL_VERSION}`;
const TELEMETRY_SEND_INTERVAL_MS = 300_000; // 5 minutes
const TELEMETRY_RECONNECT_MAX_DELAY_MS = 10_000;
const TELEMETRY_NOTICE_KEY = "telemetryPrivacyNoticeShown";

export async function announceTelemetryPrivacy(app: BotApp) {
	const existingRows = await app.db.select().from(appMetaTable).where(eq(appMetaTable.key, TELEMETRY_NOTICE_KEY)).limit(1);

	if (existingRows[0]) {
		return;
	}

	if (isMinimalTrackingEnabled(app)) {
		app.logger.warn(
			`
PRIVACY NOTICE
-------------------------------
Minimal tracking is enabled; the following information is sent anonymously:
* Current source version
* Runtime version
-------------------------------`.trim()
		);
	} else {
		app.logger.warn(
			`
PRIVACY NOTICE
-------------------------------
Telemetry is currently set to full and the following information is sent anonymously:
* Discord bot guild count and user count
* Current source version
* Runtime version
* OS version
* CPU model, core count, and architecture
* Current process uptime
* System total RAM and free RAM
-------------------------------
If you wish to minimize the information that is sent, set "minimalTracking" to true in the config.`.trim()
		);
	}

	await app.db
		.insert(appMetaTable)
		.values({
			key: TELEMETRY_NOTICE_KEY,
			value: "true",
			updatedAt: Date.now()
		})
		.onConflictDoUpdate({
			target: appMetaTable.key,
			set: {
				value: "true",
				updatedAt: Date.now()
			}
		});
}

export function startTelemetry(app: BotApp, guildCount: number) {
	const enableLog = shouldShowWSLog(app);
	let socket: WebSocket | null = null;
	let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	let sendInterval: ReturnType<typeof setInterval> | null = null;
	let stopped = false;

	const clearReconnectTimeout = () => {
		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
			reconnectTimeout = null;
		}
	};

	const clearSendInterval = () => {
		if (sendInterval) {
			clearInterval(sendInterval);
			sendInterval = null;
		}
	};

	const logSocketEvent = (message: string, error?: unknown) => {
		if (!enableLog) {
			return;
		}

		if (error) {
			app.logger.warn(message, error);
			return;
		}

		app.logger.info(message);
	};

	const scheduleReconnect = () => {
		if (stopped || reconnectTimeout) {
			return;
		}

		reconnectTimeout = setTimeout(() => {
			reconnectTimeout = null;
			connect();
			// We add a random delay to the reconnect to avoid thundering herd problem if the telemetry server is down.
		}, Math.random() * TELEMETRY_RECONNECT_MAX_DELAY_MS);
	};

	const cleanupSocket = (instance: WebSocket | null) => {
		if (socket === instance) {
			socket = null;
		}

		clearSendInterval();
	};

	const sendTelemetry = async (instance: WebSocket) => {
		if (instance !== socket || instance.readyState !== WebSocket.OPEN) {
			return;
		}

		try {
			instance.send(JSON.stringify(await buildTelemetryPayload(app, guildCount)));
		} catch (error) {
			logSocketEvent("Telemetry websocket send failed.", error);
		}
	};

	const connect = () => {
		if (stopped || socket) {
			return;
		}

		clearReconnectTimeout();
		const nextSocket = new WebSocket(TELEMETRY_SOCKET_URL, TELEMETRY_SOCKET_PROTOCOL);
		socket = nextSocket;

		nextSocket.addEventListener("open", () => {
			if (socket !== nextSocket) {
				nextSocket.close();
				return;
			}

			logSocketEvent("Connected to telemetry websocket.");
			void sendTelemetry(nextSocket);

			clearSendInterval();
			sendInterval = setInterval(() => {
				void sendTelemetry(nextSocket);
			}, TELEMETRY_SEND_INTERVAL_MS);
		});

		nextSocket.addEventListener("error", (event: Event) => {
			logSocketEvent("Telemetry websocket error.", event);
			cleanupSocket(nextSocket);
			scheduleReconnect();
		});

		nextSocket.addEventListener("close", () => {
			logSocketEvent("Telemetry websocket closed.");
			cleanupSocket(nextSocket);
			scheduleReconnect();
		});
	};

	connect();

	return () => {
		stopped = true;
		clearReconnectTimeout();
		clearSendInterval();
		socket?.close();
		socket = null;
	};
}

async function buildTelemetryPayload(app: BotApp, guildCount: number) {
	const runtime = getRuntimeInfo();

	if (isMinimalTrackingEnabled(app)) {
		return {
			type: "telemetry",
			data: {
				infos: {
					ticketbotVersion: BOT_VERSION,
					runtimeName: runtime.name,
					runtimeVersion: runtime.version
				}
			}
		};
	}

	const guild = await app.client.api.guilds.get(app.config.guildId, { with_counts: true }).catch(() => null);
	const cpuInfo = os.cpus()[0];

	return {
		type: "telemetry",
		data: {
			stats: {
				guilds: guildCount,
				users: guild?.approximate_member_count ?? 0
			},
			infos: {
				ticketbotVersion: BOT_VERSION,
				runtimeName: runtime.name,
				runtimeVersion: runtime.version,
				os: os.platform(),
				osVersion1: os.release(),
				osVersion2: os.version(),
				uptime: process.uptime(),
				ram: {
					total: os.totalmem(),
					free: os.freemem()
				},
				cpu: {
					model: cpuInfo?.model ?? "unknown",
					cores: os.cpus().length,
					arch: os.arch()
				}
			}
		}
	};
}

function isMinimalTrackingEnabled(app: BotApp) {
	return app.config.minimalTracking ?? false;
}

function shouldShowWSLog(app: BotApp) {
	return app.config.showWSLog ?? false;
}

function getRuntimeInfo() {
	const bunVersion = (process.versions as Record<string, string | undefined>).bun;

	if (typeof bunVersion === "string") {
		return {
			name: "bun",
			version: bunVersion
		} as const;
	}

	return {
		name: "node",
		version: process.versions.node
	} as const;
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

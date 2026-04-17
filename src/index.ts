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

import { config } from "dotenv";
import { createBotApp } from "@/app";
import { createLogger } from "@/core/logger";
import { BOT_VERSION } from "@/version";

const REPOSITORY_TAGS_URL = "https://api.github.com/repos/Sayrix/Ticket-Bot/tags";
const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)$/;
const logger = createLogger("boot");

console.log(`
\x1b[38;2;143;110;250m████████╗██╗ ██████╗██╗  ██╗███████╗████████╗    ██████╗  ██████╗ ████████╗
\x1b[38;2;157;101;254m╚══██╔══╝██║██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝    ██╔══██╗██╔═══██╗╚══██╔══╝
\x1b[38;2;172;90;255m   ██║   ██║██║     █████╔╝ █████╗     ██║       ██████╔╝██║   ██║   ██║   
\x1b[38;2;188;76;255m   ██║   ██║██║     ██╔═██╗ ██╔══╝     ██║       ██╔══██╗██║   ██║   ██║   
\x1b[38;2;205;54;255m   ██║   ██║╚██████╗██║  ██╗███████╗   ██║       ██████╔╝╚██████╔╝   ██║   
\x1b[38;2;222;0;255m   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝       ╚═════╝  ╚═════╝    ╚═╝\x1b[0m
`);

config({ path: "./config/.env", quiet: true });
void checkForUpdates();

async function main() {
	const { start, stop } = await createBotApp();

	process.on("SIGINT", () => {
		void stop().finally(() => process.exit(0));
	});

	process.on("SIGTERM", () => {
		void stop().finally(() => process.exit(0));
	});

	await start();
}

main().catch(async (error) => {
	logger.error("Failed to start bot", error);
	process.exit(1);
});

async function checkForUpdates() {
	try {
		const response = (await fetch(REPOSITORY_TAGS_URL, {
			headers: {
				accept: "application/vnd.github+json"
			}
		})) as any;

		if (!response.ok) {
			logger.warn(`Failed to pull latest version from server (${response.status}).`);
			return;
		}

		const tags = (await response.json()) as Array<{ name?: string }>;
		const latestTag = tags.find((tag) => parseVersion(tag.name));
		const latestVersion = latestTag ? parseVersion(latestTag.name) : null;
		const currentVersion = parseVersion(BOT_VERSION);

		if (!latestTag?.name || !latestVersion || !currentVersion) {
			logger.warn("Failed to parse repository tags for update checking.");
			return;
		}

		if (compareVersions(latestVersion, currentVersion) > 0) {
			logger.warn(`🔄️ New version available: ${latestTag.name}; current version: ${BOT_VERSION}.`);
			return;
		}

		logger.info(`Ticket-Bot is up to date (${BOT_VERSION}). Latest tag: ${latestTag.name}.`);
	} catch (error) {
		logger.warn("Failed to check for updates.", error);
	}
}

function parseVersion(value: string | undefined) {
	if (!value) {
		return null;
	}

	const match = VERSION_PATTERN.exec(value.trim());

	if (!match) {
		return null;
	}

	return match.slice(1).map((segment) => Number.parseInt(segment, 10));
}

function compareVersions(left: number[], right: number[]) {
	for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
		const delta = (left[index] ?? 0) - (right[index] ?? 0);

		if (delta !== 0) {
			return delta;
		}
	}

	return 0;
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

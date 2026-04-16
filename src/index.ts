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

config({ path: "./config/.env", quiet: true });

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
	console.error("[boot] Failed to start bot", error);
	process.exit(1);
});

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

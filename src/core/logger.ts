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

export interface Logger {
	info(message: string, ...meta: unknown[]): void;
	warn(message: string, ...meta: unknown[]): void;
	error(message: string, ...meta: unknown[]): void;
}

export function createLogger(scope: string): Logger {
	const write = (level: string, message: string, meta: unknown[]) => {
		const prefix = `[${scope}] ${level}`;

		if (meta.length === 0) {
			console.log(prefix, message);
			return;
		}

		console.log(prefix, message, ...meta);
	};

	return {
		info(message, ...meta) {
			write("INFO", message, meta);
		},
		warn(message, ...meta) {
			write("WARN", message, meta);
		},
		error(message, ...meta) {
			write("ERROR", message, meta);
		}
	};
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

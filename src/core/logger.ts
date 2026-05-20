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

function write(output: (...data: unknown[]) => void, level: string, message: string, meta: unknown[], scope: string) {
	const prefix = `[${scope}] ${level}`;

	if (meta.length === 0) {
		output(prefix, message);
		return;
	}

	output(prefix, message, ...meta);
}

export function createLogger(scope: string): Logger {
	return {
		info(message, ...meta) {
			write(console.log, "\x1b[39;44mINFO\x1b[0m", message, meta, scope);
		},
		warn(message, ...meta) {
			write(console.warn, "\x1b[39;43mWARN\x1b[0m", message, meta, scope);
		},
		error(message, ...meta) {
			write(console.error, "\x1b[39;41mERROR\x1b[0m", message, meta, scope);
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

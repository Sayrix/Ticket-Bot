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

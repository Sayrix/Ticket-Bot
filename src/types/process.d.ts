export {};

declare global {
	namespace NodeJS {
		interface ProcessEnv extends Record<string, string> {
			DB_FILE_NAME: string;
			DISCORD_TOKEN: string;
		}
	}
}

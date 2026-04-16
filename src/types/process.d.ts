export {};

declare global {
	namespace NodeJS {
		interface ProcessEnv extends Record<string, string | undefined> {
			DB_FILE_NAME: string;
			DISCORD_TOKEN: string;
			TICKETPM_PASSKEY?: string;
		}
	}
}

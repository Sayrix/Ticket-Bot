declare module "@discordjs/rest" {
	export class REST {
		public constructor(options?: { version?: string });
		public setToken(token: string | undefined): REST;
		public on(event: string, listener: (payload: unknown) => void): void;
	}
}

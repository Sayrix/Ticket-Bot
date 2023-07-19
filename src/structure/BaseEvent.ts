import {ExtendedClient} from "./";
import {ClientEvents} from "discord.js";

export default abstract class BaseEvent {
	protected readonly client: ExtendedClient;
	protected constructor(client: ExtendedClient) {
		this.client = client;
	}

    // eslint-disable-next-line no-unused-vars
    protected abstract execute(...args: ClientEvents[keyof ClientEvents]): void | Promise<void>;

}
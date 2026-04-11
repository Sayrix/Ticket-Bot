import { GatewayDispatchEvents, type GatewayReadyDispatchData, type ToEventProps } from "@discordjs/core";
import { defineEvent } from "@/core/defineEvent";

const readyEvent = defineEvent<[ToEventProps<GatewayReadyDispatchData>]>({
	name: GatewayDispatchEvents.Ready,
	once: true,
	async execute(app, event) {
		app.logger.info(`Connected as ${event.data.user.username}.`);
	}
});

export default readyEvent;

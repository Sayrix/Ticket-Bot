import type { GatewayInteractionCreateDispatchData, ToEventProps } from "@discordjs/core";
import { GatewayDispatchEvents, InteractionType } from "@discordjs/core";
import { defineEvent } from "@/core/defineEvent";

const interactionCreateEvent = defineEvent<[ToEventProps<GatewayInteractionCreateDispatchData>]>({
	name: GatewayDispatchEvents.InteractionCreate,
	async execute(app, event) {
		if (event.data.type === InteractionType.Ping) {
			return;
		}

		await app.router.handleInteraction(event.data);
	}
});

export default interactionCreateEvent;

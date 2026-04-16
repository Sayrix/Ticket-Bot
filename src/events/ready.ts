import { GatewayDispatchEvents, type GatewayReadyDispatchData, type ToEventProps } from "@discordjs/core";
import { defineEvent } from "@/core/defineEvent";
import { deployApplicationCommands } from "@/deploy-commands";
import { syncTicketPanels } from "@/features/tickets/service";

const readyEvent = defineEvent<[ToEventProps<GatewayReadyDispatchData>]>({
	name: GatewayDispatchEvents.Ready,
	once: true,
	async execute(app, event) {
		app.logger.info(`Connected as ${event.data.user.username}.`);

		await deployApplicationCommands({
			applicationCommands: app.registry.applicationCommands,
			clientId: app.config.clientId,
			guildId: app.config.guildId,
			logger: app.logger,
			token: process.env.DISCORD_TOKEN
		});
		await syncTicketPanels(app);
	}
});

export default readyEvent;

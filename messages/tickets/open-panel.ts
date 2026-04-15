import { ComponentType } from "discord-api-types/v10";
import { createPanelOpenerSlot } from "@/features/tickets/messages";
import type { LoadedMessageTemplate } from "@/features/tickets/types";

// Classic embed + components version:

// const openPanelMessage: LoadedMessageTemplate = {
// 	useComponentsV2: false,
// 	embeds: [
// 		{
// 			title: "Open a Ticket",
// 			description: "Choose the category that matches your request and the bot will create a private ticket for you.",
// 			color: 16106539
// 		}
// 	],
// 	components: [createPanelOpenerSlot()]
// };

// Components V2 version:

const openPanelMessage: LoadedMessageTemplate = {
	useComponentsV2: true,
	components: [
		{
			type: ComponentType.Container,
			accent_color: 16106539,
			components: [
				{
					type: ComponentType.TextDisplay,
					content: "## Open a Ticket"
				},
				{
					type: ComponentType.TextDisplay,
					content: "Choose the category that matches your request and the bot will create a private ticket for you."
				},
				{
					type: ComponentType.Separator
				},
				{
					type: ComponentType.Separator,
					spacing: 1,
					divider: false
				},
				createPanelOpenerSlot()
			]
		}
	]
};

export default openPanelMessage;

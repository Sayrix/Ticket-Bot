import { ComponentType } from "@discordjs/core";
import type { LoadedMessageTemplate } from "@/features/tickets/types";

const ticketClosedDmMessage: LoadedMessageTemplate = {
	components: [
		{
			type: ComponentType.Container,
			accent_color: 16106539,
			components: [
				{
					type: ComponentType.TextDisplay,
					content: "## Your ticket has been closed"
				},
				{
					type: ComponentType.TextDisplay,
					content: "**Reason**\n{reason}"
				},
				{
					type: ComponentType.TextDisplay,
					content: "**Claim**\n{claimStatus}"
				},
				{
					type: ComponentType.TextDisplay,
					content: "**Transcript**\n{transcriptStatus}"
				},
				{
					type: ComponentType.TextDisplay,
					content: "_Closed by {closerName}_"
				}
			]
		}
	]
};

export default ticketClosedDmMessage;

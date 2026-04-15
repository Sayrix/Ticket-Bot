import { ComponentType } from "@discordjs/core";
import type { LoadedMessageTemplate } from "@/features/tickets/types";

const ticketClosedMessage: LoadedMessageTemplate = {
	components: [
		{
			type: ComponentType.Container,
			accent_color: 16106539,
			components: [
				{
					type: ComponentType.TextDisplay,
					content: "## Ticket Closed"
				},
				{
					type: ComponentType.TextDisplay,
					content: "<@{userId}>'s ticket has been closed."
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
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							custom_id: "{deleteButtonCustomId}",
							label: "Delete Ticket",
							style: 4
						}
					]
				}
			]
		}
	]
};

export default ticketClosedMessage;

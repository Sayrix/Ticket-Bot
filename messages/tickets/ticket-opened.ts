import { ComponentType } from "@discordjs/core";
import { createMessageSlot } from "@/features/tickets/messages";
import type { LoadedMessageTemplate } from "@/features/tickets/types";

const ticketOpenedMessage: LoadedMessageTemplate = {
	components: [
		{
			type: ComponentType.TextDisplay,
			content: "{createdByMention}"
		},
		{
			type: ComponentType.Container,
			accent_color: 16106539,
			components: [
				{
					type: ComponentType.TextDisplay,
					content: "## {ticketTypeName} Ticket"
				},
				{
					type: ComponentType.TextDisplay,
					content: "Thanks for opening a ticket."
				},
				{
					type: ComponentType.TextDisplay,
					content: "**Details**\n{reason}"
				},
				{
					type: ComponentType.TextDisplay,
					content: "**Claim Status**\n{claimStatus}"
				},
				createMessageSlot("actions")
			]
		}
	]
};

export default ticketOpenedMessage;

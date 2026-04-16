import { defineConfig } from "@/config/index.ts";

export default defineConfig("0.0.1", {
	// Your Discord application (bot) client ID.
	clientId: "123456789012345678",
	// The guild where the bot is installed and where commands should be deployed.
	guildId: "123456789012345678",
	lang: "en",
	// Transcript ID style used by ticket.pm uploads.
	// "uuid" matches the current default. "emoji" keeps the older style.
	uuidType: "uuid",

	tickets: {
		// Fallback channel name used when a ticket type does not override it.
		// Available parameters here:
		// {ticketNumber} {ticketTypeKey} {ticketTypeName} {userId} {username}
		channelNameTemplate: "{ticketNumber}-ticket-{username}",
		// How many open tickets a single user may have at once. Use 0 for unlimited.
		maxOpenPerUser: 1,
		// Global staff roles that can see and manage tickets.
		staffRoleIds: ["111111111111111111"],
		// Roles that are blocked from opening any ticket type by default.
		blockedRoleIds: ["222222222222222222"],
		// Roles mentioned in the welcome message when a ticket is opened.
		mentionRoleIds: ["333333333333333333"],
		// Message template path inside the messages directory.
		defaultWelcomeMessage: "tickets/ticket-opened",
		// Optional plain text appended to the welcome message template.
		defaultWelcomeContent: "A staff member will be with you shortly. Please explain your issue clearly.",

		claims: {
			enabled: true,
			// soft: claiming is optional
			// strict: tickets must be claimed before they can be closed
			// display-only: claimed state is shown, but close rules do not change
			mode: "soft",
			// Adds claim and unclaim buttons to the welcome message.
			showButtons: true,
			// Lets the current claimer release the ticket.
			allowUnclaim: true,
			// Optional rename applied after a successful claim.
			// Available parameters here:
			// {claimerId} {claimerUsername} {createdById} {createdByUsername}
			// {ticketNumber} {ticketTypeKey} {ticketTypeName}
			nameWhenClaimed: "{ticketNumber}-claimed-{claimerUsername}",
			// Optional category move applied after a successful claim.
			// Leave blank to keep the ticket in its original category.
			categoryWhenClaimed: "444444444444444444",
			// disabled: nobody can take an existing claim
			// staff: any configured staff member can take over
			// roles: only roles listed in takeoverRoleIds can take over
			takeoverMode: "roles",
			takeoverRoleIds: ["555555555555555555"]
		},
		close: {
			// If true, only staff can close tickets.
			staffOnly: true,
			// Send the opener a DM when the ticket closes.
			dmUserOnClose: true,
			// Ask the closer for a reason before closing.
			askForReason: true,
			// Adds a close button to the ticket welcome message.
			showCloseButton: true,
			// Delete the channel after close instead of keeping it around for review.
			deleteChannelOnClose: false,
			// Generate a transcript through the configured transcript provider.
			createTranscript: true,
			// Optional category for closed tickets when the channel is not deleted.
			// Leave blank to keep the ticket where it is.
			closeTicketCategoryId: "666666666666666666",
			// Message template path used for the DM sent on close.
			dmMessage: "tickets/ticket-closed-dm",
			// Message template path posted in the closed ticket channel.
			channelMessage: "tickets/ticket-closed"
		}
	},

	ticketTypes: {
		general: {
			name: "General Support",
			description: "General help and account questions.",
			// You can use a unicode emoji, a custom emoji string like <:name:id>, or just an emoji ID.
			emoji: "<:ticket:171717171717171717>",
			categoryId: "777777777777777777",
			// Optional per-type channel name override.
			channelNameTemplate: "{ticketNumber}-general-{username}",
			// Optional per-type welcome message template override.
			message: "tickets/ticket-opened",
			// Optional plain text appended after the message template.
			welcomeContent: "Tell us what you need help with and include screenshots if they matter.",
			// Optional per-type block list.
			blockedRoleIds: ["888888888888888888"],
			// Optional per-type staff roles in addition to global staff roles.
			staffRoleIds: ["999999999999999999"]
		},
		billing: {
			name: "Billing",
			description: "Payments, invoices, and subscription issues.",
			emoji: "<:billing:181818181818181818>",
			categoryId: "101010101010101010",
			welcomeContent: "Please include invoice numbers, order IDs, or the last payment date if you have them.",
			staffRoleIds: ["121212121212121212"],
			openForm: {
				title: "Billing Ticket",
				questions: [
					{
						key: "orderNumber",
						label: "Order number",
						placeholder: "Example: INV-12345",
						style: "short",
						required: false,
						maxLength: 100
					},
					{
						key: "issue",
						label: "What is the billing issue?",
						placeholder: "Explain the problem clearly",
						style: "paragraph",
						required: true,
						minLength: 10,
						maxLength: 1000
					}
				]
			}
		},
		report: {
			name: "Report",
			description: "Report a player, member, or rule violation.",
			emoji: "<:report:191919191919191919>",
			categoryId: "131313131313131313",
			openForm: {
				title: "Report Details",
				questions: [
					{
						key: "user",
						label: "Who are you reporting?",
						placeholder: "Username or user ID",
						style: "short",
						required: true,
						maxLength: 100
					},
					{
						key: "summary",
						label: "What happened?",
						placeholder: "Write a clear summary of the issue",
						style: "paragraph",
						required: true,
						minLength: 20,
						maxLength: 1000
					}
				]
			}
		}
	},

	panels: {
		supportSelect: {
			channelId: "141414141414141414",
			// Message template path inside the messages directory.
			message: "tickets/open-panel",
			// Optional text posted alongside the panel template.
			content: "Choose the ticket type that fits your issue best.",
			opener: {
				type: "inline-select",
				ticketTypes: ["general", "billing", "report"],
				placeholder: "Open a ticket"
			}
		},
		supportButtonSelect: {
			channelId: "151515151515151515",
			message: "tickets/open-panel",
			content: "Click the button, then choose the matching ticket type.",
			opener: {
				type: "button-select",
				ticketTypes: ["general", "billing"],
				label: "Open Support Ticket",
				emoji: "<:open_ticket:202020202020202020>",
				style: "primary",
				placeholder: "Choose a ticket type",
				disabled: false
			}
		},
		quickButtons: {
			channelId: "161616161616161616",
			message: "tickets/open-panel",
			content: "Fast one-click ticket buttons for the most common flows.",
			opener: {
				type: "buttons",
				buttons: [
					{
						ticketType: "general",
						label: "General Help",
						emoji: "<:ticket:171717171717171717>",
						style: "primary"
					},
					{
						ticketType: "billing",
						label: "Billing Help",
						emoji: "<:billing:181818181818181818>",
						style: "secondary"
					},
					{
						ticketType: "report",
						label: "Report User",
						emoji: "<:report:191919191919191919>",
						style: "danger"
					}
				]
			}
		}
	}
});

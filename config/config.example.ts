/*
Ticket-Bot is licensed under the GNU Affero General Public License,
version 3 only ("AGPL-3.0-only"). See LICENSE.md for the full license text.

Additional Term under GNU AGPL v3, Section 7(b):

You are required to preserve and display, in a location clearly visible
to end users interacting with the bot (such as bot embeds, the bot's
"Bio" Discord profile, status, or equivalent), a notice that the
software is powered by Ticket-Bot, including a link to the original
project repository or to its website.

This notice must not be removed, obscured, or replaced.
*/

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
	logs: {
		// Set to true to post audit logs for ticket actions.
		enabled: true,
		// Channel where ticket audit logs will be sent.
		channelId: "171717171717171717",
		// Omit this object to enable every supported log type.
		events: {
			ticketCreate: true,
			ticketClaim: true,
			ticketUnclaim: true,
			ticketClose: true,
			ticketDelete: true,
			userAdded: true,
			userRemoved: true,
			ticketRename: true
		}
	},
	status: {
		// Set to false to leave the bot presence untouched.
		enabled: true,
		// Activity text shown in the member list.
		text: "github.com/Sayrix",
		// PLAYING, STREAMING, LISTENING, WATCHING, CUSTOM, COMPETING
		type: "WATCHING",
		// Only used for STREAMING.
		url: "https://twitch.tv/example",
		// online, idle, dnd, invisible
		status: "online"
	},

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
		// Fallback open-ticket template path inside the messages directory.
		// Create your own file under messages/ and point a ticket type at it.
		// Example file: messages/tickets/ticket-opened-billing.ts
		// Example config path: "tickets/ticket-opened-billing"
		defaultWelcomeMessage: "tickets/ticket-opened",
		// Optional plain text appended to the welcome message template.
		// Available parameters here:
		// {channelId} {claimStatus} {claimerId} {claimerMention} {createdByMention}
		// {reason} {reason1} {reason2} ... {reasonN}
		// {ticketNumber} {ticketTypeKey} {ticketTypeName} {userId} {username}
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
			// Global fallback template path for the DM sent on close.
			// A ticket type can override this with ticketTypes.<key>.close.dmMessage.
			dmMessage: "tickets/ticket-closed-dm",
			// Global fallback template path posted in the closed ticket channel.
			// A ticket type can override this with ticketTypes.<key>.close.channelMessage.
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
			// Available parameters here:
			// {ticketNumber} {ticketTypeKey} {ticketTypeName} {userId} {username}
			channelNameTemplate: "{ticketNumber}-general-{username}",
			// Optional per-type open-ticket template override.
			// Copy messages/tickets/ticket-opened.ts to a new file if this type
			// needs its own embed/container layout, then link it here.
			message: "tickets/ticket-opened",
			// Optional plain text appended after the message template.
			// Available parameters here:
			// {channelId} {claimStatus} {claimerId} {claimerMention} {createdByMention}
			// {reason} {reason1} {reason2} ... {reasonN}
			// {ticketNumber} {ticketTypeKey} {ticketTypeName} {userId} {username}
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
			// This ticket type still uses the global open-ticket template.
			// If you want a custom open layout, create another file in messages/
			// and set `message` here the same way as the close overrides below.
			// Available parameters here:
			// {channelId} {claimStatus} {claimerId} {claimerMention} {createdByMention}
			// {reason} {reason1} {reason2} ... {reasonN}
			// {ticketNumber} {ticketTypeKey} {ticketTypeName} {userId} {username}
			welcomeContent: "Please include invoice numbers, order IDs, or the last payment date if you have them.",
			// Optional per-type close templates.
			// These override tickets.close.dmMessage and tickets.close.channelMessage.
			// The sample files below are included in this repository.
			close: {
				dmMessage: "tickets/ticket-closed-dm-billing",
				channelMessage: "tickets/ticket-closed-billing"
			},
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
			welcomeContent:
				"Details: {reason1}\n\nAdditional info: {reason2}\n\nPlease provide any evidence you have and our staff will review it as soon as possible.",
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
			// Each panel can use its own template file inside the messages directory.
			// Example: create messages/tickets/open-panel-billing.ts and point this
			// to "tickets/open-panel-billing" if you want a different panel layout.
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

/*
Ticket-Bot is licensed under the GNU Affero General Public License,
version 3 only ("AGPL-3.0-only"). See LICENSE.md for the full license text.

Additional Term under GNU AGPL v3, Section 7(b):

You are required to preserve and display, in a location clearly visible
to end users interacting with the bot (such as bot embeds, the bot's
"Bio" Discord profile, status, or equivalent), a notice that the
software is powered by Ticket-Bot, including a link to the original
project repository or to its website.

This notice must not be removed, obscured, or replaced.
*/

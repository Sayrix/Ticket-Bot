import type { BaseTranslation } from "../i18n-types.js";

const en: BaseTranslation = {
	shared: {
		unexpected_interaction_error: "An unexpected error occurred while handling this interaction.",
		no_reason_provided: "No additional details were provided.",
		claim_status: {
			claimed_by: "Claimed by <@{userId:string}>",
			unclaimed: "Unclaimed"
		},
		transcript_status: {
			ready: "[Open Transcript]({url:string})",
			unavailable: "Unavailable or still processing."
		}
	},
	commands: {
		add: {
			description: "Add someone to the current ticket",
			options: {
				user: {
					description: "The user to add"
				}
			},
			choose_user: "Choose a user to add to this ticket.",
			already_has_access: "That user already has access to this ticket.",
			already_invited: "That user is already invited to this ticket.",
			invite_limit_reached: "You cannot invite more than {limit:number} users to one ticket.",
			success: "Added <@{userId:string}> to this ticket."
		},
		claim: {
			description: "Claim the current ticket",
			disabled: "Ticket claiming is disabled.",
			already_claimed: "You already claimed this ticket.",
			cannot_take_over: "This ticket is already claimed and cannot be taken over.",
			only_staff: "Only staff can claim this ticket.",
			success: "You claimed this ticket.",
			reassigned: "Ticket reassigned to <@{userId:string}>."
		},
		close: {
			description: "Close the current ticket"
		},
		cleardm: {
			description: "Clear the bot's ticket history from your DMs",
			starting: "Clearing your ticket DM history...",
			dm_unavailable: "I could not access your DM channel.",
			cleared: "Cleared {count:number} ticket DM messages.",
			none_found: "No ticket DM messages were found."
		},
		mass_add: {
			description: "Add multiple users to the current ticket",
			options: {
				users: {
					description: "Comma-separated user IDs or mentions"
				}
			},
			provide_users: "Provide at least one user ID or mention.",
			summary: {
				added: "Added {mentions:string}.",
				none_added: "No users were added.",
				skipped_existing: "Skipped {count:number} user(s) that already had access.",
				skipped_invalid: "Skipped {count:number} invalid user ID(s).",
				limit_reached: "Stopped when the {limit:number}-user ticket limit was reached."
			}
		},
		remove: {
			description: "Remove invited users from the current ticket",
			options: {
				user: {
					description: "The invited user to remove immediately"
				}
			},
			no_invited_users: "There are no invited users to remove from this ticket.",
			select_users: "Select the invited users you want to remove from this ticket.",
			select_placeholder: "Choose users to remove",
			not_invited: "Those users are not invited to this ticket.",
			success: "Removed {mentions:string} from this ticket."
		},
		rename: {
			description: "Rename the current ticket",
			options: {
				name: {
					description: "The new ticket channel name"
				}
			},
			only_staff: "Only staff can rename this ticket.",
			provide_name: "Provide a new ticket name.",
			success: "Ticket renamed to <#{channelId:string}>."
		},
		unclaim: {
			description: "Unclaim the current ticket",
			disabled: "Unclaiming is disabled for this server.",
			not_claimed: "This ticket is not claimed.",
			only_current_claimer: "Only the current claimer can unclaim this ticket.",
			success: "You unclaimed this ticket."
		}
	},
	tickets: {
		records: {
			not_ticket_channel: "This interaction was not used in a ticket channel.",
			not_open_ticket: "This channel is not an open ticket.",
			already_closed: "This ticket is already closed."
		},
		panel: {
			no_visible_types: "You do not have access to any ticket types on this panel.",
			select_type: "Please select a ticket type.",
			unavailable_type: "That ticket type is not available from this panel.",
			select_placeholder: "Select a ticket type"
		},
		open: {
			not_allowed_type: "You are not allowed to create that ticket type.",
			unavailable_type: "That ticket type is not available from this panel.",
			max_open_reached: "You already have the maximum number of open tickets ({limit:number}).",
			created: "Your ticket has been created: <#{channelId:string}>",
			question_answer: "{label:string}: {answer:string}"
		},
		claim: {
			only_staff: "Only staff can claim this ticket."
		},
		actions: {
			close_ticket: "Close Ticket",
			claim_ticket: "Claim Ticket",
			unclaim_ticket: "Unclaim Ticket",
			delete_ticket: "Delete Ticket"
		},
		close: {
			delete_channel_start: "Deleting ticket channel...",
			modal: {
				title: "Close Ticket",
				reason_label: "Reason",
				reason_placeholder: "Why is this ticket being closed?"
			},
			status: {
				preparing_transcript: "Preparing transcript...",
				closing_ticket: "Closing ticket...",
				updating_access: "Updating ticket access...",
				transcript_still_processing: "Transcript is still processing. Finishing ticket close...",
				sending_close_confirmation: "Sending close confirmation...",
				sending_close_updates: "Sending close updates...",
				posting_close_summary: "Posting close summary...",
				closed: "Ticket closed."
			},
			deleted_with_transcript: "Ticket closed. The transcript is ready and the channel will now be deleted.",
			deleted_without_transcript: "Ticket closed. The channel will now be deleted.",
			only_staff: "Only staff can close this ticket.",
			must_be_claimed: "This ticket must be claimed before it can be closed.",
			only_current_claimer: "Only the current claimer can close this ticket.",
			not_ticket: "This channel is not a ticket.",
			only_closed_delete: "Only closed tickets can be deleted from this button.",
			only_staff_delete: "Only staff can delete this ticket."
		},
		transcript: {
			collecting_messages: "Collecting ticket messages...",
			creating: "Creating transcript...",
			uploading: "Uploading transcript...",
			uploading_avatars: "Uploading avatars...",
			uploading_attachments: "Uploading attachments...",
			progress: "{label:string} ({completed:number}/{total:number})"
		},
		templates: {
			open_panel: {
				title: "## Open a Ticket",
				description: "Choose the category that matches your request and the bot will create a private ticket for you."
			},
			ticket_opened: {
				title: "## {ticketTypeName:string} Ticket",
				intro: "Thanks for opening a ticket.",
				details_label: "**Details**\n{reason:string}",
				claim_status: "**Claim Status**: {claimStatus:string}"
			},
			ticket_opened_general: {
				title: "## General Support Ticket",
				intro: "A support team member will review this request soon.",
				details_label: "**Summary**\n{reason:string}",
				claim_status: "**Claim Status**: {claimStatus:string}"
			},
			ticket_opened_billing: {
				title: "## Billing Ticket",
				intro: "Include invoice numbers, payment method, and any failed transaction details.",
				details_label: "**Submitted Details**\n{reason:string}",
				claim_status: "**Claim Status**: {claimStatus:string}"
			},
			ticket_opened_report: {
				title: "## Report Ticket",
				intro: "Moderation staff will review the report and any evidence attached.",
				details_label: "**Report Details**\n{reason:string}",
				claim_status: "**Claim Status**: {claimStatus:string}"
			},
			ticket_closed: {
				title: "## Ticket Closed",
				subtitle: "<@{userId:string}>'s ticket has been closed.",
				details: "**Reason**: {reason:string}\n**Claim**: {claimStatus:string}\n**Transcript**: {transcriptStatus:string}",
				closed_by: "-# _Closed by {closerName:string}_"
			},
			ticket_closed_general: {
				title: "## General Support Closed",
				subtitle: "<@{userId:string}>'s general support ticket is now closed.",
				details: "**Reason**: {reason:string}\n**Claim**: {claimStatus:string}\n**Transcript**: {transcriptStatus:string}",
				closed_by: "-# _Closed by {closerName:string}_"
			},
			ticket_closed_billing: {
				title: "## Billing Ticket Closed",
				subtitle: "<@{userId:string}>'s billing ticket has been closed.",
				details: "**Close Reason**: {reason:string}\n**Claim**: {claimStatus:string}\n**Transcript**: {transcriptStatus:string}",
				closed_by: "-# _Closed by {closerName:string}_"
			},
			ticket_closed_report: {
				title: "## Report Case Closed",
				subtitle: "The report opened by <@{userId:string}> has been closed.",
				details:
					"**Resolution Note**: {reason:string}\n**Claim**: {claimStatus:string}\n**Transcript**: {transcriptStatus:string}",
				closed_by: "-# _Closed by {closerName:string}_"
			},
			ticket_closed_dm: {
				title: "## Your ticket has been closed",
				details: "**Reason**: {reason:string}\n**Claim**: {claimStatus:string}\n**Transcript**: {transcriptStatus:string}",
				closed_by: "-# _Closed by {closerName:string}_"
			},
			ticket_closed_dm_general: {
				title: "## Your general support ticket has been closed",
				details: "**Reason**: {reason:string}\n**Claim**: {claimStatus:string}\n**Transcript**: {transcriptStatus:string}",
				closed_by: "-# _Closed by {closerName:string}_"
			},
			ticket_closed_dm_billing: {
				title: "## Your billing ticket has been closed",
				intro: "If you still need help, open a new billing ticket and include your order details again.",
				details: "**Reason**: {reason:string}\n**Claim**: {claimStatus:string}\n**Transcript**: {transcriptStatus:string}",
				closed_by: "-# _Closed by {closerName:string}_"
			},
			ticket_closed_dm_report: {
				title: "## Your report ticket has been closed",
				intro: "Staff reviewed the report and any attached evidence.",
				details:
					"**Resolution Note**: {reason:string}\n**Claim**: {claimStatus:string}\n**Transcript**: {transcriptStatus:string}",
				closed_by: "-# _Closed by {closerName:string}_"
			}
		}
	},
	logs: {
		duration: {
			day_short: "d",
			hour_short: "h",
			minute_short: "m",
			second_short: "s"
		},
		templates: {
			ticket_created: {
				title: "## Ticket Created",
				action: "{actorMention:string} opened {ticketChannelMention:string}.",
				details:
					"**Ticket**: #{ticketId:string} - {ticketTypeName:string}\n**Opened By**: {createdByMention:string}\n**Created**: {createdAt:string}\n**Reason**: {reason:string}"
			},
			ticket_claimed: {
				title: "## Ticket Claimed",
				action: "{actorMention:string} claimed {ticketChannelMention:string}.",
				details:
					"**Ticket**: #{ticketId:string} - {ticketTypeName:string}\n**Opened By**: {createdByMention:string}\n**Open Age**: {ticketAge:string}"
			},
			ticket_unclaimed: {
				title: "## Ticket Unclaimed",
				action: "{actorMention:string} unclaimed {ticketChannelMention:string}.",
				details:
					"**Ticket**: #{ticketId:string} - {ticketTypeName:string}\n**Opened By**: {createdByMention:string}\n**Open Age**: {ticketAge:string}"
			},
			ticket_closed: {
				title: "## Ticket Closed",
				action: "{actorMention:string} closed {ticketChannelMention:string}.",
				details:
					"**Ticket**: #{ticketId:string} - {ticketTypeName:string}\n**Opened By**: {createdByMention:string}\n**Claim Status**: {claimStatus:string}\n**Open Age**: {ticketAge:string}\n**Reason**: {reason:string}\n**Transcript**: {transcriptStatus:string}"
			},
			ticket_deleted: {
				title: "## Ticket Deleted",
				action: "{actorMention:string} deleted {ticketChannelMention:string}.",
				details:
					"**Ticket**: #{ticketId:string} - {ticketTypeName:string}\n**Opened By**: {createdByMention:string}\n**Claim Status**: {claimStatus:string}\n**Open Age**: {ticketAge:string}\n**Close Reason**: {reason:string}\n**Transcript**: {transcriptStatus:string}"
			},
			ticket_renamed: {
				title: "## Ticket Renamed",
				action: "{actorMention:string} renamed {ticketChannelMention:string}.",
				details:
					"**Ticket**: #{ticketId:string} - {ticketTypeName:string}\n**Opened By**: {createdByMention:string}\n**From**: `{oldChannelName:string}`\n**To**: `{newChannelName:string}`"
			},
			user_added: {
				title: "## User Added",
				action: "{actorMention:string} added {targetMention:string} to {ticketChannelMention:string}.",
				details: "**Ticket**: #{ticketId:string} - {ticketTypeName:string}\n**Opened By**: {createdByMention:string}"
			},
			user_removed: {
				title: "## User Removed",
				action: "{actorMention:string} removed {targetMention:string} from {ticketChannelMention:string}.",
				details: "**Ticket**: #{ticketId:string} - {ticketTypeName:string}\n**Opened By**: {createdByMention:string}"
			}
		}
	}
};

export default en;

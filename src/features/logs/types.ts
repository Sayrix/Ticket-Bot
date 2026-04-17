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

import type { APIUser } from "@discordjs/core";

export interface TicketLogTicketContext {
	ticketId: string;
	ticketChannelId: string;
	ticketTypeKey: string;
	ticketTypeName: string;
	createdAt: number;
	createdById: string;
	claimedById?: string | null;
}

interface BaseTicketLogEvent {
	actor: APIUser;
	ticket: TicketLogTicketContext;
}

export interface TicketCreateLogEvent extends BaseTicketLogEvent {
	kind: "ticketCreate";
	reason: string;
}

export interface TicketClaimLogEvent extends BaseTicketLogEvent {
	kind: "ticketClaim";
}

export interface TicketUnclaimLogEvent extends BaseTicketLogEvent {
	kind: "ticketUnclaim";
}

export interface TicketCloseLogEvent extends BaseTicketLogEvent {
	kind: "ticketClose";
	reason: string;
	transcriptUrl?: string | null;
}

export interface TicketDeleteLogEvent extends BaseTicketLogEvent {
	kind: "ticketDelete";
	reason: string;
	transcriptUrl?: string | null;
}

export interface UserAddedLogEvent extends BaseTicketLogEvent {
	kind: "userAdded";
	targetId: string;
}

export interface UserRemovedLogEvent extends BaseTicketLogEvent {
	kind: "userRemoved";
	targetId: string;
}

export interface TicketRenameLogEvent extends BaseTicketLogEvent {
	kind: "ticketRename";
	newChannelName: string;
	oldChannelName: string;
}

export type TicketLogEvent =
	| TicketCreateLogEvent
	| TicketClaimLogEvent
	| TicketUnclaimLogEvent
	| TicketCloseLogEvent
	| TicketDeleteLogEvent
	| UserAddedLogEvent
	| UserRemovedLogEvent
	| TicketRenameLogEvent;

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

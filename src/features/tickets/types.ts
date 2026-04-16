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

import type { APIAllowedMentions, APIEmbed, APIMessageTopLevelComponent } from "@discordjs/core";
import type { VersionedConfig } from "@/config/index";

export type CurrentConfig = VersionedConfig<"0.0.1">;
export type TicketTypeConfig = CurrentConfig["ticketTypes"][string];
export type TicketQuestionConfig = NonNullable<TicketTypeConfig["openForm"]>["questions"][number];
export type PanelConfig = CurrentConfig["panels"][string];
export type PanelOpenerConfig = PanelConfig["opener"];
export type ButtonPanelEntryConfig = Extract<PanelOpenerConfig, { type: "buttons" }>["buttons"][number];
export type ButtonStyleName = NonNullable<Extract<PanelOpenerConfig, { type: "button-select" }>["style"]>;
export type TicketClaimsConfig = CurrentConfig["tickets"]["claims"];
export type TicketClaimMode = TicketClaimsConfig["mode"];

export interface LoadedMessageTemplate {
	allowed_mentions?: APIAllowedMentions;
	content?: string;
	embeds?: APIEmbed[];
	components?: APIMessageTopLevelComponent[];
	flags?: number;
	useComponentsV2?: boolean;
}

export interface TicketOpenContext {
	ticketTypeKey: string;
	panelKey?: string;
}

export interface TicketRenderTokens {
	[key: string]: string | undefined;
	channelId?: string;
	claimStatus?: string;
	claimerId?: string;
	claimerMention?: string;
	createdByMention?: string;
	reason: string;
	ticketNumber: string;
	ticketTypeKey: string;
	ticketTypeName: string;
	userId: string;
	username: string;
}

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

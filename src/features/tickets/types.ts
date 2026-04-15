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

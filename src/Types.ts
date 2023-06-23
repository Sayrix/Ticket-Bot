/* Licensed under Apache License 2.0: https://github.com/Sayrix/Ticket-Bot/blob/typescript/LICENSE */

import type { Client, Collection, Interaction, SlashCommandBuilder } from "discord.js";
import type { QuickDB } from "quick.db";

// Config types and setups
type TicketQuestion = {
    label: string;
    placeholder: string;
    style: string;
    maxLength: number;
}
export type TicketType = {
    codeName: string;
    name: string;
    description: string;
	emoji: string;
	color: string;
    categoryId: string;
    ticketNameOption: string;
    customDescription: string;
    cantAccess: string[];
    askQuestions: boolean;
    questions: TicketQuestion[];
}
type dbConn = {
	enabled: boolean;
	host: string;
	user: string;
	password: string;
	database: string;
	table: string;
}
export type config = {
	clientId: string;
	guildId: string;
	mainColor: string;
	lang: string; // Tho can be cs/de/es/fr/main/tr type but we can't guarantee what users put
	// Database credentials are deprecated, will be removed when Prisma are in-place.
	postgre?: dbConn;
	mysql?: dbConn;
	closeTicketCategoryId: string;
	openTicketChannelId: string;
	ticketTypes: TicketType[];
    ticketNameOption: string;
    ticketNamePrefixWhenClaimed: string;
    rolesWhoHaveAccessToTheTickets: string[];
    rolesWhoCanNotCreateTickets: string[];
    pingRoleWhenOpened: boolean;
    roleToPingWhenOpenedId: string[];
    logs: boolean;
    logsChannelId: string;
    claimButton: boolean;
    whoCanCloseTicket: "STAFFONLY" | "EVERYONE";
    closeButton: boolean;
    askReasonWhenClosing: boolean;
    createTranscript: boolean;
    status: {
        enabled: boolean;
        text: string;
        type: "PLAYING" | "STREAMING"| "LISTENING" | "WATCHING" | "COMPETING",
        url?: string,
        status: "online"
    },
    maxTicketOpened: number;
	minimalTracking: boolean;
}
export type locale = {
    embeds: {
		openTicket: {
			title: string,
			color?: number,
			description: string,
			footer: {
				text: string
			}
		},
		ticketOpened: {
			title: string,
			description: string,
			footer: {
				text: string,
				iconUrl?: string
			}
		},
		ticketClosed: {
			title: string,
			description: string
		},
		ticketClosedDM: {
			title: string,
			color?: string,
			description: string,
			footer: {
				text: string,
				iconUrl?: string
			}
		}
	},
	modals: {
		reasonTicketOpen: {
			title: string,
			label: string,
			placeholder: string
		},
		reasonTicketClose: {
			title: string,
			label: string,
			placeholder: string
		}
	},
	buttons: {
		close: {
			label: string,
			emoji: string
		},
		claim: {
			label: string,
			emoji: string
		}
	},
	ticketOpenedMessage: string,
	ticketOnlyClaimableByStaff: string,
	ticketAlreadyClaimed: string,
	ticketClaimedMessage: string,
	ticketOnlyClosableByStaff: string,
	ticketOnlyRenamableByStaff: string;
	ticketRenamed: string;
	noTickets: string;
	ticketAlreadyClosed: string,
	ticketCreatingTranscript: string,
	ticketTranscriptCreated: string,
	ticketLimitReached: string,

	other: {
		openTicketButtonMSG: string,
		deleteTicketButtonMSG: string,
		selectTicketTypePlaceholder: string,
		claimedBy: string,
		noReasonGiven: string,
		unavailable: string
	}
}

export type command = {
	data: SlashCommandBuilder;
	// eslint-disable-next-line no-unused-vars
	execute: (interaction: Interaction, client: DiscordClient) => Promise<void> | void;
}

export interface DiscordClient extends Client<boolean> {
	config: config;
	db: QuickDB;
	locales: locale;
	// eslint-disable-next-line no-unused-vars
	msToHm: (ms: number | Date) => string;
	commands: Collection<string, command>;
}

export type SayrixSponsorData = {
	sponsor: {
		login: string;
		name: string;
		avatarUrl: string;
		websiteUrl?: string;
		linkUrl: string;
		type: string;
		avatarUrlHighRes: string;
		avatarUrlMediumRes: string;
		avatarUrlLowRes: string;
	},
	isOneTime: boolean;
	monthlyDollars: number;
	privacyLevel: string;
	tierName: string;
	createdAt: string;
	provider: string;
}
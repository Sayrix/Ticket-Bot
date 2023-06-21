import { Client, Collection, Interaction, SlashCommandBuilder } from "discord.js";
import { QuickDB } from "quick.db";

// Config types and setups
type TicketQuestion = {
    label: string;
    placeholder: string;
    style: string;
    maxLength: number;
}
type TicketType = {
    codeName: string;
    name: string;
    description: string;
    categoryId: string;
    ticketNameOption: string;
    customDescription: string;
    cantAccess: string[];
    askQuestion: boolean;
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
	maincolor: string;
	lang: string; // Tho can be cs/de/es/fr/main/tr type but we can't guarantee what users put
	// Database credentials are deprecated, will be removed when Prisma are in-place.
	postgre?: dbConn;
	mysql?: dbConn;
	closeTicketCategoryId: string;
	openTicketChannelId: string;
	TicketTypes: TicketType[];
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
        type: "PLAYING" | "WATCHING" | "LISTENING" | "STREAMING" | "COMPETING",
        url?: string,
        status: "online"
    },
    maxTicketOpened: number;
}
export type locale = {
    embeds: {
		openTicket: {
			title: string,
			description: string,
			footer: {
				text: string
			}
		},
		ticketOpened: {
			title: string,
			description: string,
			footer: {
				text: string
			}
		},
		ticketClosed: {
			title: string,
			description: string
		},
		ticketClosedDM: {
			title: string,
			description: string,
			footer: {
				text: string
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
	execute: (interaction: Interaction, client: DiscordClient) => Promise<void> | void;
}

export interface DiscordClient extends Client<boolean> {
	config: config;
	db: QuickDB<any>;
	locales: locale;
	msToHm: (ms: number) => string;
	commands: Collection<string, command>;
}

/* Licensed under Apache License 2.0: https://github.com/Sayrix/Ticket-Bot/blob/typescript/LICENSE */

import {ColorResolvable} from "discord.js";

export type ConfigType = {
    clientId: string;
    guildId: string;
    mainColor: ColorResolvable;
    lang: string; // Tho can be cs/de/es/fr/main/tr type but we can't guarantee what users put
    closeTicketCategoryId: string;
    openTicketChannelId: string;
    ticketTypes: TicketType[];
    ticketNameOption: string;
    claimOption: {
        claimButton: boolean;
        nameWhenClaimed?: string;
        categoryWhenClaimed?: string;
    };
    rolesWhoHaveAccessToTheTickets: string[];
    rolesWhoCanNotCreateTickets: string[];
    pingRoleWhenOpened: boolean;
    roleToPingWhenOpenedId: string[];
    logs: boolean;
    logsChannelId: string;
    closeOption: {
        closeButton: boolean;
        dmUser: boolean;
        createTranscript: boolean;
        askReason: boolean;
        whoCanCloseTicket: "STAFFONLY" | "EVERYONE";
        closeTicketCategoryId?: string;
    };
    uuidType: "uuid" | "emoji";
    status: {
        enabled: boolean;
        text: string;
        type: "PLAYING" | "STREAMING"| "LISTENING" | "WATCHING" | "COMPETING",
        url?: string,
        status: "online"
    },
    maxTicketOpened: number;
    minimalTracking: boolean;
    showWSLog: boolean;
}

export type LocaleType = {
    embeds: {
        openTicket: {
            title: string,
            color?: ColorResolvable,
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
            color?: ColorResolvable,
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
    invalidConfig: string;
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

export type SponsorType = {
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

// Config types and setups
type TicketQuestionType = {
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
    color?: ColorResolvable;
    categoryId: string;
    ticketNameOption: string;
    customDescription: string;
    cantAccess: string[];
    askQuestions: boolean;
    questions: TicketQuestionType[];
    staffRoles?: string[];
}
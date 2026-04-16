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

interface ConfigV0_0_1 {
	/** The client ID of the bot application */
	clientId: string;
	/** The ID of the Discord server the bot is set up in */
	guildId: string;
	/** The lang of the bot */
	lang: "en";
	/** Controls the transcript ID style when uploading to ticket.pm */
	uuidType?: "uuid" | "emoji";
	status?: {
		enabled: boolean;
		text?: string;
		type?: "PLAYING" | "STREAMING" | "LISTENING" | "WATCHING" | "CUSTOM" | "COMPETING";
		url?: string;
		status: "online" | "idle" | "dnd" | "invisible";
	};
	tickets: {
		channelNameTemplate: string;
		maxOpenPerUser: number;
		staffRoleIds: string[];
		blockedRoleIds: string[];
		mentionRoleIds: string[];
		defaultWelcomeMessage?: string;
		defaultWelcomeContent?: string;
		claims: {
			enabled: boolean;
			mode: "soft" | "strict" | "display-only";
			showButtons: boolean;
			allowUnclaim: boolean;
			nameWhenClaimed?: string;
			categoryWhenClaimed?: string;
			takeoverMode: "disabled" | "staff" | "roles";
			takeoverRoleIds?: string[];
		};
		close: {
			staffOnly: boolean;
			dmUserOnClose: boolean;
			askForReason: boolean;
			showCloseButton: boolean;
			deleteChannelOnClose: boolean;
			createTranscript: boolean;
			closeTicketCategoryId?: string;
			dmMessage?: string;
			channelMessage?: string;
		};
	};
	ticketTypes: Record<
		string,
		{
			name: string;
			description?: string;
			emoji?: string;
			categoryId: string;
			channelNameTemplate?: string;
			message?: string;
			welcomeContent?: string;
			blockedRoleIds?: string[];
			staffRoleIds?: string[];
			openForm?: {
				title: string;
				questions: Array<{
					key: string;
					label: string;
					placeholder?: string;
					style?: "short" | "paragraph";
					required?: boolean;
					minLength?: number;
					maxLength?: number;
				}>;
			};
		}
	>;
	panels: Record<
		string,
		{
			channelId: string;
			message: string;
			content?: string;
			opener:
				| {
						type: "inline-select";
						ticketTypes: string[];
						placeholder?: string;
				  }
				| {
						type: "button-select";
						ticketTypes: string[];
						label: string;
						emoji?: string;
						style?: "primary" | "secondary" | "success" | "danger";
						placeholder?: string;
						disabled?: boolean;
				  }
				| {
						type: "buttons";
						buttons: Array<{
							ticketType: string;
							label?: string;
							emoji?: string;
							style?: "primary" | "secondary" | "success" | "danger";
							disabled?: boolean;
						}>;
				  };
		}
	>;
}

interface ConfigVersions {
	"0.0.1": ConfigV0_0_1;
}

type ConfigVersion = keyof ConfigVersions;

type ConfigOf<V extends ConfigVersion> = ConfigVersions[V];

export type VersionedConfig<V extends ConfigVersion = ConfigVersion> = {
	version: V;
} & ConfigOf<V>;

export type AnyVersionedConfig = VersionedConfig<ConfigVersion>;

export function defineConfig<V extends ConfigVersion>(version: V, config: ConfigOf<V>): VersionedConfig<V> {
	return {
		version,
		...config
	};
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

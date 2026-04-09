interface ConfigV0_0_1 {
	/** The client ID of the bot application */
	clientId: string;
	/** The ID of the Discord server the bot is set up in */
	guildId: string;
	/** The lang of the bot */
	lang: "en";

	/** The ticket types / categories the users can choose */
	ticketTypes: Record<
		string,
		{
			/** The name of the ticket type */
			name: string;
			/** The description displayed in the select menu */
			description?: string;
			/** The emoji displayed in the select menu. Can be unicode or custom emoji ID. */
			emoji?: string;
			/** The ID of the category where the ticket channels will be created. */
			categoryId: string;
			/** The name of the ticket channel */
			ticketName: string;
		}
	>;
}

interface ConfigVersions {
	"0.0.1": ConfigV0_0_1;
}

type ConfigVersion = keyof ConfigVersions;

type ConfigOf<V extends ConfigVersion> = ConfigVersions[V];

type VersionedConfig<V extends ConfigVersion = ConfigVersion> = {
	version: V;
} & ConfigOf<V>;

export function defineConfig<V extends ConfigVersion>(version: V, config: ConfigOf<V>): VersionedConfig<V> {
	return {
		version,
		...config
	};
}

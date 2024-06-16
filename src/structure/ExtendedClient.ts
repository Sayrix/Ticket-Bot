import {Client, ClientOptions, Collection, Routes} from "discord.js";
import {BaseCommand, ConfigType} from "./";
import {PrismaClient} from "@prisma/client";
import fs from "fs-extra";
import path from "node:path";
import {AddCommand, MassAddCommand, ClaimCommand, CloseCommand, RemoveCommand, RenameCommand, clearDM} from "../commands";
import {InteractionCreateEvent, ReadyEvent} from "../events";
import {jsonc} from "jsonc";
import {REST} from "@discordjs/rest";
import {Translation} from "../utils/translation";

export default class ExtendedClient extends Client {
	public readonly config: ConfigType;
	public readonly prisma: PrismaClient;
	public locales: Translation;
	public commands: Collection<string, BaseCommand>;
	constructor(options: ClientOptions, config: ConfigType) {
		super(options);

		this.config = config;
		this.prisma = new PrismaClient({
			errorFormat: "minimal"
		});
		this.locales = new Translation(this.config.lang, path.join(__dirname, "../../locales/"));
		this.commands = new Collection([
			[AddCommand.data.name, new AddCommand(this)],
			[MassAddCommand.data.name, new MassAddCommand(this)],
			[ClaimCommand.data.name, new ClaimCommand(this)],
			[CloseCommand.data.name, new CloseCommand(this)],
			[RemoveCommand.data.name, new RemoveCommand(this)],
			[RenameCommand.data.name, new RenameCommand(this)],
			[clearDM.data.name, new clearDM(this)],
		]);
		this.loadEvents();

	}

	public msToHm (ms: number | Date) {

		if(ms instanceof Date) ms = ms.getTime();

		const days = Math.floor(ms / (24 * 60 * 60 * 1000));
		const daysms = ms % (24 * 60 * 60 * 1000);
		const hours = Math.floor(daysms / (60 * 60 * 1000));
		const hoursms = ms % (60 * 60 * 1000);
		const minutes = Math.floor(hoursms / (60 * 1000));
		const minutesms = ms % (60 * 1000);
		const sec = Math.floor(minutesms / 1000);

		let result = "0s";

		if (days > 0) result = `${days}d ${hours}h ${minutes}m ${sec}s`;
		if (hours > 0) result = `${hours}h ${minutes}m ${sec}s`;
		if (minutes > 0) result = `${minutes}m ${sec}s`;
		if (sec > 0) result = `${sec}s`;
		return result;

	}

	private loadEvents () {
		this.on("interactionCreate", (interaction) => new InteractionCreateEvent(this).execute(interaction));
		this.on("ready", () => new ReadyEvent(this).execute());
	}

	public deployCommands() {
		const commands = [
			AddCommand.data.toJSON(),
			ClaimCommand.data.toJSON(),
			CloseCommand.data.toJSON(),
			RemoveCommand.data.toJSON(),
			RenameCommand.data.toJSON(),
			clearDM.data.toJSON(),
		];

		const { guildId } = jsonc.parse(fs.readFileSync(path.join(__dirname, "../../config/config.jsonc"), "utf8"));

		if(!process.env["TOKEN"]) throw Error("Discord Token Expected, deploy-command");
		const rest = new REST({ version: "10" }).setToken(process.env["TOKEN"]);

		rest
			.put(Routes.applicationGuildCommands(this.user?.id ?? "", guildId), { body: commands })
			.then(() => console.log("✅  Successfully registered application commands."))
			.catch(console.error);
	}
}

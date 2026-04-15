import type { CommandModule } from "@/core/types";

export function defineCommand<const TCommand extends CommandModule>(command: TCommand) {
	return command;
}

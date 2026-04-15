import { defineCommand } from "@/core/defineCommand";
import { executeUnclaimCommand } from "@/features/tickets/claim-workflow";

export default defineCommand({
	data: {
		name: "unclaim",
		description: "Unclaim the current ticket"
	},
	execute: executeUnclaimCommand
});

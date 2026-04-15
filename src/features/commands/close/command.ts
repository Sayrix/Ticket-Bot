import { defineCommand } from "@/core/defineCommand";
import { executeCloseCommand } from "@/features/tickets/close-workflow";

export default defineCommand({
	data: {
		name: "close",
		description: "Close the current ticket"
	},
	execute: executeCloseCommand
});

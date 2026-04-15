import { defineCommand } from "@/core/defineCommand";
import { executeClaimCommand } from "@/features/tickets/claim-workflow";

export default defineCommand({
	data: {
		name: "claim",
		description: "Claim the current ticket"
	},
	execute: executeClaimCommand
});

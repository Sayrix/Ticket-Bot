import { defineFeature } from "@/core/defineFeature";
import { handleRemoveUsersSelect } from "@/features/commands/remove/command";
import { handleClaimButton, handleUnclaimButton } from "@/features/tickets/claim-workflow";
import { handleCloseButton, handleCloseReasonSubmit, handleDeleteClosedTicketButton } from "@/features/tickets/close-workflow";
import { handleOpenFormSubmit, handleOpenPanelSelector, handlePanelButtons, handlePanelSelect } from "@/features/tickets/service";

const ticketsFeature = defineFeature({
	key: "tickets",
	buttons: {
		claim: handleClaimButton,
		close: handleCloseButton,
		"delete-closed": handleDeleteClosedTicketButton,
		"open-select": handleOpenPanelSelector,
		"open-type": handlePanelButtons,
		unclaim: handleUnclaimButton
	},
	stringSelects: {
		"panel-select": handlePanelSelect,
		"remove-users": handleRemoveUsersSelect
	},
	modals: {
		"submit-close-reason": handleCloseReasonSubmit,
		"submit-open-form": handleOpenFormSubmit
	}
});

export default ticketsFeature;

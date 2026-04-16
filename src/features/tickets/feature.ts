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

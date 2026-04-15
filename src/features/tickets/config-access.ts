import type { BotApp } from "@/core/types";
import type { PanelConfig, TicketTypeConfig } from "@/features/tickets/types";
import { isBlockedByRoles } from "@/features/tickets/utils";

export function getPanel(app: BotApp, panelKey: string) {
	const panel = app.config.panels[panelKey];

	if (!panel) {
		throw new Error(`Unknown panel "${panelKey}".`);
	}

	return panel;
}

export function getTicketType(app: BotApp, ticketTypeKey: string) {
	const ticketType = app.config.ticketTypes[ticketTypeKey];

	if (!ticketType) {
		throw new Error(`Unknown ticket type "${ticketTypeKey}".`);
	}

	if (ticketType.openForm && ticketType.openForm.questions.length > 5) {
		throw new Error(`Ticket type "${ticketTypeKey}" has more than 5 modal questions.`);
	}

	return ticketType;
}

export function getPanelTicketTypeKeys(panel: PanelConfig) {
	return panel.opener.type === "buttons" ? panel.opener.buttons.map((button) => button.ticketType) : panel.opener.ticketTypes;
}

export function userCanAccessTicketType(app: BotApp, ticketType: TicketTypeConfig, roleIds: string[]) {
	return !isBlockedByRoles([...app.config.tickets.blockedRoleIds, ...(ticketType.blockedRoleIds ?? [])], roleIds);
}

export function getTicketStaffRoleIds(app: BotApp, ticketType: TicketTypeConfig) {
	return [...new Set([...app.config.tickets.staffRoleIds, ...(ticketType.staffRoleIds ?? [])])];
}

export function hasTicketStaffAccess(app: BotApp, ticketType: TicketTypeConfig, roleIds: string[]) {
	const allowedRoleIds = new Set(getTicketStaffRoleIds(app, ticketType));
	return roleIds.some((roleId) => allowedRoleIds.has(roleId));
}

export function validatePanelConfig(app: BotApp, panelKey: string, panel: PanelConfig) {
	const ticketTypeKeys = getPanelTicketTypeKeys(panel);

	for (const ticketTypeKey of ticketTypeKeys) {
		getTicketType(app, ticketTypeKey);
	}

	if (panel.opener.type === "buttons" && panel.opener.buttons.length > 25) {
		throw new Error(`Panel "${panelKey}" has more than 25 buttons.`);
	}

	if (panel.opener.type !== "buttons" && panel.opener.ticketTypes.length > 25) {
		throw new Error(`Panel "${panelKey}" has more than 25 select options.`);
	}
}

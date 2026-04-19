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

import type {
	APIActionRowComponent,
	APIButtonComponentWithCustomId,
	APIMessageComponentInteraction,
	APIMessageTopLevelComponent,
	APIStringSelectComponent
} from "@discordjs/core";
import { ComponentType, MessageFlags } from "@discordjs/core";
import { eq } from "drizzle-orm";
import { createCustomId } from "@/core/custom-id";
import { reply } from "@/core/respond";
import type { BotApp, ComponentExecutionContext } from "@/core/types";
import { panelMessagesTable } from "@/db/schema";
import {
	getPanel,
	getPanelTicketTypeKeys,
	getTicketType,
	userCanAccessTicketType,
	validatePanelConfig
} from "@/features/tickets/config-access";
import { appendMessageText, finalizeMessageTemplate, loadMessageTemplate } from "@/features/tickets/messages";
import { continueTicketOpen } from "@/features/tickets/ticket-workflow";
import type { ButtonPanelEntryConfig, PanelConfig, PanelOpenerConfig } from "@/features/tickets/types";
import { chunk, getMemberRoleIds, mapButtonStyle, toPartialEmoji } from "@/features/tickets/utils";

export async function syncTicketPanels(app: BotApp) {
	for (const [panelKey, panel] of Object.entries(app.config.panels)) {
		try {
			await syncSinglePanel(app, panelKey, panel);
		} catch (error) {
			app.logger.error(`Failed to sync ticket panel "${panelKey}".`, error);
		}
	}
}

export async function handleOpenPanelSelector(context: ComponentExecutionContext, interaction: APIMessageComponentInteraction) {
	const panelKey = context.route.state[0];

	if (!panelKey) {
		throw new Error("Missing panel key.");
	}

	const panel = getPanel(context.app, panelKey);

	if (panel.opener.type !== "button-select") {
		throw new Error(`Panel "${panelKey}" is not configured for button-select mode.`);
	}

	const options = getVisibleTicketOptions(context.app, panel, interaction);

	if (options.length === 0) {
		await reply(context.app, interaction, {
			content: context.app.LL.tickets.panel.no_visible_types(),
			flags: MessageFlags.Ephemeral
		});
		return;
	}

	await reply(context.app, interaction, {
		flags: MessageFlags.Ephemeral,
		components: [createSelectRow(context.app, panelKey, panel.opener, options)]
	});
}

export async function handlePanelButtons(context: ComponentExecutionContext, interaction: APIMessageComponentInteraction) {
	const ticketTypeKey = context.route.state[1];

	if (!ticketTypeKey) {
		throw new Error("Missing ticket type key.");
	}

	await continueTicketOpen(context.app, interaction, { panelKey: context.route.state[0], ticketTypeKey });
}

export async function handlePanelSelect(context: ComponentExecutionContext, interaction: APIMessageComponentInteraction) {
	const panelKey = context.route.state[0];

	if (!panelKey) {
		throw new Error("Missing panel key.");
	}

	const panel = getPanel(context.app, panelKey);
	const values = "values" in interaction.data ? interaction.data.values : [];
	const ticketTypeKey = values[0];

	if (!ticketTypeKey) {
		await reply(context.app, interaction, {
			content: context.app.LL.tickets.panel.select_type(),
			flags: MessageFlags.Ephemeral
		});
		return;
	}

	const allowedTicketTypes = new Set(getPanelTicketTypeKeys(panel));

	if (!allowedTicketTypes.has(ticketTypeKey)) {
		await reply(context.app, interaction, {
			content: context.app.LL.tickets.panel.unavailable_type(),
			flags: MessageFlags.Ephemeral
		});
		return;
	}

	await continueTicketOpen(context.app, interaction, { panelKey, ticketTypeKey });
}

async function syncSinglePanel(app: BotApp, panelKey: string, panel: PanelConfig) {
	validatePanelConfig(app, panelKey, panel);

	const existingRows = await app.db.select().from(panelMessagesTable).where(eq(panelMessagesTable.panelKey, panelKey)).limit(1);
	const existing = existingRows[0];
	const body = await buildPanelMessage(app, panelKey, panel);
	const shouldReuseStoredMessage = existing && existing.channelId === panel.channelId;

	if (shouldReuseStoredMessage) {
		// Reuse the tracked panel message when possible so admins can restart the bot
		// without accumulating duplicate panel posts.
		const existingMessage = await app.client.api.channels.getMessage(existing.channelId, existing.messageId).catch(() => null);

		if (existingMessage) {
			if (shouldRecreateForComponentsV2(existingMessage, body)) {
				const recreatedMessage = await recreatePanelMessage(app, panel, existingMessage.id, body);
				await persistPanelMessage(app, panelKey, panel.channelId, recreatedMessage.id);
				return;
			}

			await app.client.api.channels.editMessage(panel.channelId, existing.messageId, body);
			await persistPanelMessage(app, panelKey, panel.channelId, existing.messageId);
			return;
		}
	}

	const createdMessage = await app.client.api.channels.createMessage(panel.channelId, body);
	await persistPanelMessage(app, panelKey, panel.channelId, createdMessage.id);
}

async function recreatePanelMessage(
	app: BotApp,
	panel: PanelConfig,
	previousMessageId: string,
	body: Awaited<ReturnType<typeof buildPanelMessage>>
) {
	const createdMessage = await app.client.api.channels.createMessage(panel.channelId, body);
	await app.client.api.channels.deleteMessage(panel.channelId, previousMessageId).catch(() => undefined);
	return createdMessage;
}

async function buildPanelMessage(app: BotApp, panelKey: string, panel: PanelConfig) {
	const messageTemplate = await loadMessageTemplate(app, panel.message);
	const withConfiguredText = appendMessageText(messageTemplate, panel.content);
	const body = placePanelOpener(withConfiguredText, buildPanelComponents(app, panelKey, panel));

	return finalizeMessageTemplate({
		...body,
		allowed_mentions: {
			...(body.allowed_mentions ?? {}),
			parse: []
		}
	});
}

function placePanelOpener(
	payload: Awaited<ReturnType<typeof loadMessageTemplate>>,
	openerComponents: APIMessageTopLevelComponent[]
) {
	if (!openerComponents.length) {
		return payload;
	}

	let replacedSlot = false;
	let appendedToContainer = false;

	const visit = (value: unknown): unknown => {
		if (Array.isArray(value)) {
			return value.flatMap((entry) => {
				if (isPanelOpenerSlot(entry)) {
					replacedSlot = true;
					return structuredClone(openerComponents);
				}

				const nextEntry = visit(entry);
				return Array.isArray(nextEntry) ? nextEntry : [nextEntry];
			});
		}

		if (!value || typeof value !== "object") {
			return value;
		}

		if (
			!replacedSlot &&
			!appendedToContainer &&
			"type" in value &&
			value.type === ComponentType.Container &&
			"components" in value &&
			Array.isArray(value.components)
		) {
			appendedToContainer = true;
			return {
				...value,
				components: [...value.components, ...structuredClone(openerComponents)]
			};
		}

		return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, visit(entry)]));
	};

	return {
		...payload,
		components: visit(payload.components ?? []) as APIMessageTopLevelComponent[]
	};
}

function isPanelOpenerSlot(value: unknown): value is {
	slot: string;
} {
	return Boolean(value && typeof value === "object" && "slot" in value && value.slot === "panel-opener");
}

function buildPanelComponents(app: BotApp, panelKey: string, panel: PanelConfig): APIMessageTopLevelComponent[] {
	switch (panel.opener.type) {
		case "inline-select":
			return [createSelectRow(app, panelKey, panel.opener, buildSelectOptions(app, panel.opener.ticketTypes))];
		case "button-select":
			return [createButtonRow(panelKey, panel.opener)];
		case "buttons":
			return chunk(panel.opener.buttons, 5).map((buttonGroup) => createButtonsRow(app, panelKey, buttonGroup));
	}
}

function createSelectRow(
	app: BotApp,
	panelKey: string,
	opener: Extract<PanelOpenerConfig, { type: "inline-select" | "button-select" }>,
	options: APIStringSelectComponent["options"]
): APIActionRowComponent<APIStringSelectComponent> {
	return {
		type: ComponentType.ActionRow,
		components: [
			{
				type: ComponentType.StringSelect,
				custom_id: createCustomId("tickets", "panel-select", panelKey),
				placeholder: opener.placeholder ?? app.LL.tickets.panel.select_placeholder(),
				min_values: 1,
				max_values: 1,
				options
			}
		]
	};
}

function createButtonRow(
	panelKey: string,
	opener: Extract<PanelOpenerConfig, { type: "button-select" }>
): APIActionRowComponent<APIButtonComponentWithCustomId> {
	return {
		type: ComponentType.ActionRow,
		components: [
			{
				type: ComponentType.Button,
				custom_id: createCustomId("tickets", "open-select", panelKey),
				label: opener.label,
				style: mapButtonStyle(opener.style),
				disabled: opener.disabled,
				emoji: toPartialEmoji(opener.emoji)
			}
		]
	};
}

function createButtonsRow(
	app: BotApp,
	panelKey: string,
	entries: ButtonPanelEntryConfig[]
): APIActionRowComponent<APIButtonComponentWithCustomId> {
	return {
		type: ComponentType.ActionRow,
		components: entries.map((entry) => ({
			type: ComponentType.Button,
			custom_id: createCustomId("tickets", "open-type", panelKey, entry.ticketType),
			label: entry.label ?? getTicketType(app, entry.ticketType).name,
			style: mapButtonStyle(entry.style ?? "secondary"),
			disabled: entry.disabled,
			emoji: toPartialEmoji(entry.emoji)
		}))
	};
}

async function persistPanelMessage(app: BotApp, panelKey: string, channelId: string, messageId: string) {
	await app.db
		.insert(panelMessagesTable)
		.values({
			panelKey,
			channelId,
			messageId,
			updatedAt: Date.now()
		})
		.onConflictDoUpdate({
			target: panelMessagesTable.panelKey,
			set: {
				channelId,
				messageId,
				updatedAt: Date.now()
			}
		});
}

function getVisibleTicketOptions(app: BotApp, panel: PanelConfig, interaction: APIMessageComponentInteraction) {
	const roleIds = getMemberRoleIds(interaction);

	return buildSelectOptions(
		app,
		getPanelTicketTypeKeys(panel).filter((ticketTypeKey) =>
			userCanAccessTicketType(app, getTicketType(app, ticketTypeKey), roleIds)
		)
	);
}

function buildSelectOptions(app: BotApp, ticketTypeKeys: string[]) {
	return ticketTypeKeys.map((ticketTypeKey) => {
		const ticketType = getTicketType(app, ticketTypeKey);

		return {
			label: ticketType.name,
			value: ticketTypeKey,
			description: ticketType.description,
			emoji: toPartialEmoji(ticketType.emoji)
		};
	});
}

function shouldRecreateForComponentsV2(
	existingMessage: {
		content?: string;
		embeds?: unknown[];
		flags?: number;
	},
	nextBody: {
		content?: string;
		embeds?: unknown[];
		flags?: number;
	}
) {
	const existingUsesComponentsV2 = Boolean((existingMessage.flags ?? 0) & MessageFlags.IsComponentsV2);
	const nextUsesComponentsV2 = Boolean((nextBody.flags ?? 0) & MessageFlags.IsComponentsV2);

	if (existingUsesComponentsV2 !== nextUsesComponentsV2) {
		// Switching the tracked panel between classic payloads and Components V2 is
		// safer as a recreate because Discord can keep incompatible fields around
		// across PATCH requests.
		return true;
	}

	if (!nextUsesComponentsV2) {
		return false;
	}

	// Discord PATCH requests keep unspecified legacy fields on the existing
	// message. Recreate tracked panel messages when moving them to Components V2
	// so old content/embeds do not survive the edit and invalidate the request.
	return Boolean(existingMessage.content?.trim()) || Boolean(existingMessage.embeds?.length);
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

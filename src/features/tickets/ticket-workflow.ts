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
	APIMessageTopLevelComponent,
	APIMessageComponentInteraction,
	APIModalSubmitInteraction,
	APIModalSubmitTextInputComponent
} from "@discordjs/core";
import type { APIComponentInContainer, APIContainerComponent } from "discord-api-types/v10";
import {
	ButtonStyle,
	ChannelType,
	ComponentType,
	MessageFlags,
	OverwriteType,
	PermissionFlagsBits,
	TextInputStyle
} from "@discordjs/core";
import { and, count, eq, isNull } from "drizzle-orm";
import { createCustomId } from "@/core/custom-id";
import { deferReply, editReply, followUp, reply, showModal, updateMessage } from "@/core/respond";
import type { BotApp, ComponentExecutionContext } from "@/core/types";
import { type TicketRecord, ticketsTable } from "@/db/schema";
import { sendTicketLog } from "@/features/logs/service";
import {
	getPanel,
	getPanelTicketTypeKeys,
	getTicketStaffRoleIds,
	getTicketType,
	userCanAccessTicketType
} from "@/features/tickets/config-access";
import { DEFAULT_NO_REASON, TICKET_ACCESS_ALLOW } from "@/features/tickets/constants";
import {
	appendMessageText,
	finalizeMessageTemplate,
	hasMessageComponentCustomId,
	loadMessageTemplate
} from "@/features/tickets/messages";
import type {
	LoadedMessageTemplate,
	TicketOpenContext,
	TicketQuestionConfig,
	TicketRenderTokens,
	TicketTypeConfig
} from "@/features/tickets/types";
import { getInteractionUser, getMemberRoleIds, renderChannelName, renderTemplate } from "@/features/tickets/utils";

interface TicketOpenReasonData {
	answers: string[];
	combined: string;
}

export async function handleOpenFormSubmit(context: ComponentExecutionContext, interaction: APIModalSubmitInteraction) {
	const ticketTypeKey = context.route.state[0];

	if (!ticketTypeKey) {
		throw new Error("Missing ticket type key.");
	}

	const ticketType = getTicketType(context.app, ticketTypeKey);
	const questions = ticketType.openForm?.questions ?? [];
	const answers = extractSubmittedValues(interaction);
	const reason = questions.length > 0 ? createTicketOpenReason(questions, answers) : createDefaultTicketOpenReason();

	await createTicket(context.app, interaction, ticketTypeKey, ticketType, reason);
}

export async function continueTicketOpen(app: BotApp, interaction: APIMessageComponentInteraction, context: TicketOpenContext) {
	const ticketType = getTicketType(app, context.ticketTypeKey);
	const panel = context.panelKey ? getPanel(app, context.panelKey) : null;
	const roleIds = getMemberRoleIds(interaction);

	if (!userCanAccessTicketType(app, ticketType, roleIds)) {
		await reply(app, interaction, {
			content: "You are not allowed to create that ticket type.",
			flags: MessageFlags.Ephemeral
		});
		return;
	}

	if (panel) {
		const allowedTypes = new Set(getPanelTicketTypeKeys(panel));

		if (!allowedTypes.has(context.ticketTypeKey)) {
			await reply(app, interaction, {
				content: "That ticket type is not available from this panel.",
				flags: MessageFlags.Ephemeral
			});
			return;
		}
	}

	const currentOpenCount = await getUserOpenTicketCount(app, getInteractionUser(interaction).id);

	if (app.config.tickets.maxOpenPerUser > 0 && currentOpenCount >= app.config.tickets.maxOpenPerUser) {
		await reply(app, interaction, {
			content: `You already have the maximum number of open tickets (${app.config.tickets.maxOpenPerUser}).`,
			flags: MessageFlags.Ephemeral
		});
		return;
	}

	if (ticketType.openForm?.questions.length) {
		await showModal(app, interaction, {
			custom_id: createCustomId("tickets", "submit-open-form", context.ticketTypeKey),
			title: ticketType.openForm.title,
			components: ticketType.openForm.questions.map((question) => ({
				type: ComponentType.ActionRow,
				components: [createQuestionInput(question)]
			}))
		});
		return;
	}

	if (interaction.data.component_type === ComponentType.StringSelect) {
		// Update the open panel message so that it resets the selection of the user, letting them open another ticket later.
		await updateMessage(app, interaction, {});
		await createTicket(app, interaction, context.ticketTypeKey, ticketType, createDefaultTicketOpenReason(), {
			responseMode: "follow-up"
		});
		return;
	}

	await createTicket(app, interaction, context.ticketTypeKey, ticketType, createDefaultTicketOpenReason());
}

async function createTicket(
	app: BotApp,
	interaction: APIMessageComponentInteraction | APIModalSubmitInteraction,
	ticketTypeKey: string,
	ticketType: TicketTypeConfig,
	reason: TicketOpenReasonData,
	options?: {
		responseMode?: "deferred-reply" | "follow-up";
	}
) {
	const responseMode = options?.responseMode ?? "deferred-reply";

	if (responseMode === "deferred-reply") {
		await deferReply(app, interaction, { flags: MessageFlags.Ephemeral });
	}

	const user = getInteractionUser(interaction);
	const ticketNumber = (await getNextTicketNumber(app)).toString();
	const createdAt = Date.now();
	const channelName = renderChannelName(ticketType.channelNameTemplate ?? app.config.tickets.channelNameTemplate, {
		ticketNumber,
		ticketTypeKey,
		ticketTypeName: ticketType.name,
		userId: user.id,
		username: user.username
	});

	const channel = await app.client.api.guilds.createChannel(app.config.guildId, {
		name: channelName,
		type: ChannelType.GuildText,
		parent_id: ticketType.categoryId,
		permission_overwrites: buildTicketPermissionOverwrites(app, user.id, ticketType)
	});
	const tokens = createTicketRenderTokens({
		channelId: channel.id,
		createdByMention: `<@${user.id}>`,
		openReason: reason,
		ticketNumber,
		ticketTypeKey,
		ticketTypeName: ticketType.name,
		userId: user.id,
		username: user.username
	});

	const ticketMessage = await app.client.api.channels.createMessage(
		channel.id,
		await buildTicketWelcomeMessage(app, ticketType, tokens)
	);
	await pinTicketWelcomeMessage(app, channel.id, ticketMessage.id);

	await app.db.insert(ticketsTable).values({
		channelId: channel.id,
		creationMessageId: ticketMessage.id,
		type: ticketTypeKey,
		reason: serializeTicketOpenReason(reason),
		createdBy: user.id,
		createdAt,
		invitedUserIds: "[]"
	});
	void sendTicketLog(app, {
		kind: "ticketCreate",
		actor: user,
		reason: reason.combined,
		ticket: {
			ticketId: ticketNumber,
			ticketChannelId: channel.id,
			ticketTypeKey,
			ticketTypeName: ticketType.name,
			createdAt,
			createdById: user.id
		}
	});

	const successMessage = {
		content: `Your ticket has been created: <#${channel.id}>`,
		flags: MessageFlags.Ephemeral
	};

	if (responseMode === "follow-up") {
		// The initial interaction response was already consumed by updateMessage().
		await followUp(app, interaction, successMessage);
		return;
	}

	await editReply(app, interaction, successMessage);
}

async function pinTicketWelcomeMessage(app: BotApp, channelId: string, messageId: string) {
	try {
		await app.client.api.channels.pinMessage(channelId, messageId);

		const messages = await app.client.api.channels.getMessages(channelId, { limit: 5 }).catch(() => []);
		const pinNotice = messages.find((message) => message.id !== messageId && message.type === 6);

		if (!pinNotice) {
			return;
		}

		await app.client.api.channels.deleteMessage(channelId, pinNotice.id).catch(() => null);
	} catch (error) {
		app.logger.warn(`Failed to pin the welcome message in ticket channel ${channelId}.`, error);
	}
}

export async function buildTicketWelcomeMessage(
	app: BotApp,
	ticketType: TicketTypeConfig,
	tokens: TicketRenderTokens,
	options?: {
		disableActions?: boolean;
	}
) {
	const messageReference = ticketType.message ?? app.config.tickets.defaultWelcomeMessage;
	const closeButtonCustomId = createCustomId("tickets", "close");
	const claimButtonCustomId = createCustomId("tickets", "claim");
	const unclaimButtonCustomId = createCustomId("tickets", "unclaim");
	const roleMentions = app.config.tickets.mentionRoleIds.map((roleId) => `<@&${roleId}>`);
	const renderedTokens = {
		...tokens,
		closeButtonCustomId,
		staffMentions: roleMentions.length ? ` ${roleMentions.join(" ")}` : ""
	};
	const messageTemplate = messageReference ? await loadMessageTemplate(messageReference, renderedTokens) : {};
	const configuredContent = ticketType.welcomeContent ?? app.config.tickets.defaultWelcomeContent;
	const runtimeText = configuredContent ? renderTemplate(configuredContent, renderedTokens) : undefined;
	const withRuntimeText = appendMessageText(messageTemplate, runtimeText, { slot: "runtime-text" });
	const buttons = buildTicketActionButtons(app, withRuntimeText, {
		closeButtonCustomId,
		claimButtonCustomId,
		unclaimButtonCustomId,
		claimedBy: tokens.claimerId,
		disableActions: options?.disableActions ?? false
	});
	const body = attachWelcomeMessageActions(withRuntimeText, buttons);

	return finalizeMessageTemplate({
		...body,
		allowed_mentions: {
			parse: [],
			users: [tokens.userId],
			roles: app.config.tickets.mentionRoleIds
		}
	});
}

export async function syncTicketWelcomeMessage(app: BotApp, ticket: TicketRecord, ticketType = getTicketType(app, ticket.type)) {
	const creator = await app.client.api.users.get(ticket.createdBy).catch(() => null);
	const tokens = createTicketRenderTokens({
		channelId: ticket.channelId,
		claimStatus: formatClaimStatus(ticket.claimedBy),
		claimerId: ticket.claimedBy ?? undefined,
		claimerMention: ticket.claimedBy ? `<@${ticket.claimedBy}>` : undefined,
		createdByMention: `<@${ticket.createdBy}>`,
		openReason: parseStoredTicketOpenReason(ticket.reason),
		ticketNumber: ticket.id.toString(),
		ticketTypeKey: ticket.type,
		ticketTypeName: ticketType.name,
		userId: ticket.createdBy,
		username: creator?.username ?? ticket.createdBy
	});
	const message = await buildTicketWelcomeMessage(app, ticketType, tokens);

	await app.client.api.channels.editMessage(ticket.channelId, ticket.creationMessageId, message);
}

function buildTicketPermissionOverwrites(app: BotApp, userId: string, ticketType: TicketTypeConfig) {
	const staffRoleIds = new Set(getTicketStaffRoleIds(app, ticketType));

	return [
		{
			id: app.config.guildId,
			type: OverwriteType.Role,
			deny: PermissionFlagsBits.ViewChannel.toString()
		},
		{
			id: userId,
			type: OverwriteType.Member,
			allow: TICKET_ACCESS_ALLOW.toString()
		},
		...Array.from(staffRoleIds).map((roleId) => ({
			id: roleId,
			type: OverwriteType.Role,
			allow: TICKET_ACCESS_ALLOW.toString()
		}))
	];
}

function buildTicketActionButtons(
	app: BotApp,
	payload: LoadedMessageTemplate,
	options: {
		closeButtonCustomId: string;
		claimButtonCustomId: string;
		unclaimButtonCustomId: string;
		claimedBy?: string;
		disableActions: boolean;
	}
): TicketActionRows | undefined {
	const buttons: APIButtonComponentWithCustomId[] = [];

	if (app.config.tickets.close.showCloseButton && !hasMessageComponentCustomId(payload, options.closeButtonCustomId)) {
		buttons.push({
			type: ComponentType.Button,
			custom_id: options.closeButtonCustomId,
			label: "Close Ticket",
			style: ButtonStyle.Danger,
			disabled: options.disableActions
		});
	}

	if (app.config.tickets.claims.enabled && app.config.tickets.claims.showButtons) {
		const button = options.claimedBy
			? ({
					type: ComponentType.Button,
					custom_id: options.unclaimButtonCustomId,
					label: "Unclaim Ticket",
					style: ButtonStyle.Secondary,
					disabled: options.disableActions
				} satisfies APIButtonComponentWithCustomId)
			: ({
					type: ComponentType.Button,
					custom_id: options.claimButtonCustomId,
					label: "Claim Ticket",
					style: ButtonStyle.Primary,
					disabled: options.disableActions
				} satisfies APIButtonComponentWithCustomId);

		if (!hasMessageComponentCustomId(payload, button.custom_id)) {
			buttons.push(button);
		}
	}

	if (!buttons.length) {
		return undefined;
	}

	return [
		{
			type: ComponentType.ActionRow,
			components: buttons
		} satisfies APIActionRowComponent<APIButtonComponentWithCustomId>
	];
}

function attachWelcomeMessageActions(
	payload: LoadedMessageTemplate,
	components: TicketActionRows | undefined
): LoadedMessageTemplate {
	if (!components?.length || !payload.components?.length) {
		return payload;
	}

	let attached = false;
	const nextComponents = payload.components.map((component) => {
		if (attached || component.type !== ComponentType.Container) {
			return component;
		}

		attached = true;
		return attachActionsToWelcomeContainer(component as WelcomeTemplateContainer, components) as APIMessageTopLevelComponent;
	});

	return {
		...payload,
		components: attached ? nextComponents : [...payload.components, ...cloneActionRows(components)]
	};
}

function attachActionsToWelcomeContainer(
	container: WelcomeTemplateContainer,
	actions: TicketActionRows
): WelcomeTemplateContainer {
	const nextComponents: WelcomeTemplateContainer["components"] = [];
	let replacedSlot = false;

	for (const component of container.components) {
		if (isActionSlot(component)) {
			nextComponents.push(...cloneActionRows(actions));
			replacedSlot = true;
			continue;
		}

		nextComponents.push(component);
	}

	if (!replacedSlot) {
		nextComponents.push(...cloneActionRows(actions));
	}

	return {
		...container,
		components: nextComponents
	};
}

function cloneActionRows(components: TicketActionRows): TicketActionRows {
	return components.map((component) => ({
		...component,
		components: [...component.components]
	}));
}

function isActionSlot(value: WelcomeTemplateComponent): value is TemplateSlotComponent {
	return "slot" in value && value.slot === "actions";
}

type TemplateSlotComponent = {
	slot: string;
	slot_kind?: string;
	type?: string;
};

type WelcomeTemplateComponent = APIComponentInContainer | TemplateSlotComponent;
type WelcomeTemplateContainer = Omit<APIContainerComponent, "components"> & {
	components: WelcomeTemplateComponent[];
};
type TicketActionRows = APIActionRowComponent<APIButtonComponentWithCustomId>[];

function createQuestionInput(question: TicketQuestionConfig) {
	return {
		type: ComponentType.TextInput,
		custom_id: question.key,
		label: question.label,
		style: question.style === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short,
		placeholder: question.placeholder,
		required: question.required ?? true,
		min_length: question.minLength,
		max_length: question.maxLength
	};
}

async function getUserOpenTicketCount(app: BotApp, userId: string) {
	const rows = await app.db
		.select({ count: count() })
		.from(ticketsTable)
		.where(and(eq(ticketsTable.createdBy, userId), isNull(ticketsTable.closedAt)));

	return Number(rows[0]?.count ?? 0);
}

async function getNextTicketNumber(app: BotApp) {
	const rows = await app.db.select({ count: count() }).from(ticketsTable);
	return Number(rows[0]?.count ?? 0) + 1;
}

function extractSubmittedValues(interaction: APIModalSubmitInteraction) {
	const values = new Map<string, string>();

	for (const component of interaction.data.components) {
		if (!("components" in component)) {
			continue;
		}

		for (const child of component.components) {
			if (child.type !== ComponentType.TextInput) {
				continue;
			}

			values.set(child.custom_id, (child as APIModalSubmitTextInputComponent).value);
		}
	}

	return values;
}

function createDefaultTicketOpenReason(): TicketOpenReasonData {
	return {
		answers: [],
		combined: DEFAULT_NO_REASON
	};
}

function createTicketOpenReason(questions: TicketQuestionConfig[], answers: Map<string, string>): TicketOpenReasonData {
	const normalizedAnswers = questions.map((question) => normalizeAnswer(answers.get(question.key)));

	return {
		answers: normalizedAnswers,
		combined: formatQuestionAnswers(questions, normalizedAnswers)
	};
}

function createTicketRenderTokens(input: {
	channelId?: string;
	claimStatus?: string;
	claimerId?: string;
	claimerMention?: string;
	createdByMention?: string;
	openReason: TicketOpenReasonData;
	ticketNumber: string;
	ticketTypeKey: string;
	ticketTypeName: string;
	userId: string;
	username: string;
}) {
	const tokens: TicketRenderTokens = {
		channelId: input.channelId,
		claimStatus: input.claimStatus ?? formatClaimStatus(input.claimerId ?? null),
		claimerId: input.claimerId,
		claimerMention: input.claimerMention,
		createdByMention: input.createdByMention,
		reason: input.openReason.combined,
		ticketNumber: input.ticketNumber,
		ticketTypeKey: input.ticketTypeKey,
		ticketTypeName: input.ticketTypeName,
		userId: input.userId,
		username: input.username
	};

	for (const [index, answer] of input.openReason.answers.entries()) {
		const placeholderNumber = (index + 1).toString();

		tokens[`reason${placeholderNumber}`] = answer;
	}

	return tokens;
}

function formatQuestionAnswers(questions: TicketQuestionConfig[], answers: string[]) {
	const lines = questions.map((question, index) => `${question.label}: ${answers[index] ?? DEFAULT_NO_REASON}`);
	return lines.join("\n");
}

function formatClaimStatus(claimedBy: string | null) {
	return claimedBy ? `Claimed by <@${claimedBy}>` : "Unclaimed";
}

function normalizeAnswer(answer: string | undefined) {
	return answer?.trim() || DEFAULT_NO_REASON;
}

function serializeTicketOpenReason(reason: TicketOpenReasonData) {
	if (!reason.answers.length) {
		return reason.combined;
	}

	return JSON.stringify({
		answers: reason.answers,
		combined: reason.combined,
		version: 1
	});
}

function parseStoredTicketOpenReason(reason: string | null | undefined): TicketOpenReasonData {
	if (!reason) {
		return createDefaultTicketOpenReason();
	}

	try {
		const parsed = JSON.parse(reason) as Partial<TicketOpenReasonData> & { version?: number };

		if (parsed.version !== 1 || !Array.isArray(parsed.answers) || typeof parsed.combined !== "string") {
			return {
				answers: [],
				combined: reason
			};
		}

		return {
			answers: parsed.answers.map((answer) => normalizeAnswer(typeof answer === "string" ? answer : undefined)),
			combined: parsed.combined
		};
	} catch {
		return {
			answers: [],
			combined: reason
		};
	}
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

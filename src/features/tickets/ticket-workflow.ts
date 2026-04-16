import type {
	APIActionRowComponent,
	APIButtonComponentWithCustomId,
	APIMessageComponentInteraction,
	APIModalSubmitInteraction,
	APIModalSubmitTextInputComponent
} from "@discordjs/core";
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
import {
	getPanel,
	getPanelTicketTypeKeys,
	getTicketStaffRoleIds,
	getTicketType,
	userCanAccessTicketType
} from "@/features/tickets/config-access";
import { DEFAULT_NO_REASON, TICKET_ACCESS_ALLOW } from "@/features/tickets/constants";
import {
	appendMessageComponents,
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

export async function handleOpenFormSubmit(context: ComponentExecutionContext, interaction: APIModalSubmitInteraction) {
	const ticketTypeKey = context.route.state[0];

	if (!ticketTypeKey) {
		throw new Error("Missing ticket type key.");
	}

	const ticketType = getTicketType(context.app, ticketTypeKey);
	const questions = ticketType.openForm?.questions ?? [];
	const answers = extractSubmittedValues(interaction);
	const reason = questions.length > 0 ? formatQuestionAnswers(questions, answers) : DEFAULT_NO_REASON;

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
		await createTicket(app, interaction, context.ticketTypeKey, ticketType, DEFAULT_NO_REASON, {
			responseMode: "follow-up"
		});
		return;
	}

	await createTicket(app, interaction, context.ticketTypeKey, ticketType, DEFAULT_NO_REASON);
}

async function createTicket(
	app: BotApp,
	interaction: APIMessageComponentInteraction | APIModalSubmitInteraction,
	ticketTypeKey: string,
	ticketType: TicketTypeConfig,
	reason: string,
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

	const tokens: TicketRenderTokens = {
		channelId: channel.id,
		createdByMention: `<@${user.id}>`,
		reason,
		ticketNumber,
		ticketTypeKey,
		ticketTypeName: ticketType.name,
		userId: user.id,
		username: user.username
	};

	const ticketMessage = await app.client.api.channels.createMessage(
		channel.id,
		await buildTicketWelcomeMessage(app, ticketType, tokens)
	);
	await pinTicketWelcomeMessage(app, channel.id, ticketMessage.id);

	await app.db.insert(ticketsTable).values({
		channelId: channel.id,
		creationMessageId: ticketMessage.id,
		type: ticketTypeKey,
		reason,
		createdBy: user.id,
		createdAt: Date.now(),
		invitedUserIds: "[]"
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
	const messageTemplate = messageReference
		? await loadMessageTemplate(messageReference, {
				...tokens,
				closeButtonCustomId
			})
		: {};
	const configuredContent = ticketType.welcomeContent ?? app.config.tickets.defaultWelcomeContent;
	const roleMentions = app.config.tickets.mentionRoleIds.map((roleId) => `<@&${roleId}>`);
	const runtimeText = [configuredContent ? renderTemplate(configuredContent, tokens) : undefined, ...roleMentions]
		.filter((part): part is string => Boolean(part?.trim()))
		.join("\n")
		.trim();
	const withRuntimeText = appendMessageText(messageTemplate, runtimeText);
	const buttons = buildTicketActionButtons(app, withRuntimeText, {
		closeButtonCustomId,
		claimButtonCustomId,
		unclaimButtonCustomId,
		claimedBy: tokens.claimerId,
		disableActions: options?.disableActions ?? false
	});
	const body = appendMessageComponents(withRuntimeText, buttons, "actions");

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
	const tokens: TicketRenderTokens = {
		channelId: ticket.channelId,
		claimStatus: formatClaimStatus(ticket.claimedBy),
		claimerId: ticket.claimedBy ?? undefined,
		claimerMention: ticket.claimedBy ? `<@${ticket.claimedBy}>` : undefined,
		createdByMention: `<@${ticket.createdBy}>`,
		reason: ticket.reason ?? DEFAULT_NO_REASON,
		ticketNumber: ticket.id.toString(),
		ticketTypeKey: ticket.type,
		ticketTypeName: ticketType.name,
		userId: ticket.createdBy,
		username: creator?.username ?? ticket.createdBy
	};
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
) {
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

function formatQuestionAnswers(questions: TicketQuestionConfig[], answers: Map<string, string>) {
	const lines = questions.map((question) => `${question.label}: ${answers.get(question.key)?.trim() || DEFAULT_NO_REASON}`);
	return lines.join("\n");
}

function formatClaimStatus(claimedBy: string | null) {
	return claimedBy ? `Claimed by <@${claimedBy}>` : "Unclaimed";
}

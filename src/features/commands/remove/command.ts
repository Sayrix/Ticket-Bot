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

import type { APIChatInputApplicationCommandInteraction, APIMessageComponentInteraction } from "@discordjs/core";
import { ComponentType, MessageFlags } from "@discordjs/core";
import { ApplicationCommandOptionType } from "discord-api-types/v10";
import { createCustomId } from "@/core/custom-id";
import { defineCommand } from "@/core/defineCommand";
import { reply, updateMessage } from "@/core/respond";
import type { ComponentExecutionContext } from "@/core/types";
import type { TicketRecord } from "@/db/schema";
import { getUserOption } from "@/features/commands/shared/options";
import { sendTicketLog } from "@/features/logs/service";
import { createTicketLogContext } from "@/features/logs/utils";
import { getInvitedUserIds, revokeTicketParticipantAccess, updateInvitedUserIds } from "@/features/tickets/participants";
import { getOpenTicketByChannel } from "@/features/tickets/records";
import { getInteractionUser } from "@/features/tickets/utils";

const REMOVE_USERS_CUSTOM_ID = createCustomId("tickets", "remove-users");

export default defineCommand({
	data: {
		name: "remove",
		description: "Remove invited users from the current ticket",
		options: [
			{
				name: "user",
				description: "The invited user to remove immediately",
				required: false,
				type: ApplicationCommandOptionType.User
			}
		]
	},
	async execute({ app }, interaction) {
		const openTicket = await getOpenTicketByChannel(app, interaction.channel_id);

		if (!openTicket.ok) {
			await reply(app, interaction, {
				content: openTicket.message,
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		const invitedUserIds = getInvitedUserIds(openTicket.ticket);

		if (invitedUserIds.length === 0) {
			await reply(app, interaction, {
				content: "There are no invited users to remove from this ticket.",
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		const selectedUser = getUserOption(interaction, "user");

		if (selectedUser) {
			await removeUsersFromTicket(app, interaction, openTicket.ticket, openTicket.ticketType.name, invitedUserIds, [
				selectedUser.userId
			]);
			return;
		}

		const options = await Promise.all(
			invitedUserIds.map(async (userId) => {
				const user = await app.client.api.users.get(userId).catch(() => null);
				return {
					label: user ? `${user.username}`.slice(0, 100) : userId,
					value: userId
				};
			})
		);

		await reply(app, interaction, {
			content: "Select the invited users you want to remove from this ticket.",
			flags: MessageFlags.Ephemeral,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.StringSelect,
							custom_id: REMOVE_USERS_CUSTOM_ID,
							placeholder: "Choose users to remove",
							min_values: 1,
							max_values: options.length,
							options
						}
					]
				}
			]
		});
	}
});

export async function handleRemoveUsersSelect(context: ComponentExecutionContext, interaction: APIMessageComponentInteraction) {
	if (interaction.data.component_type !== ComponentType.StringSelect) {
		return;
	}

	const openTicket = await getOpenTicketByChannel(context.app, interaction.channel_id);

	if (!openTicket.ok) {
		await updateMessage(context.app, interaction, {
			content: openTicket.message,
			components: []
		});
		return;
	}

	const invitedUserIds = getInvitedUserIds(openTicket.ticket);
	const selectedUserIds = interaction.data.values.filter((userId: string) => invitedUserIds.includes(userId));

	await removeUsersFromTicket(
		context.app,
		interaction,
		openTicket.ticket,
		openTicket.ticketType.name,
		invitedUserIds,
		selectedUserIds,
		{
			responseMode: "update-message"
		}
	);
}

async function removeUsersFromTicket(
	app: ComponentExecutionContext["app"],
	interaction: APIChatInputApplicationCommandInteraction | APIMessageComponentInteraction,
	ticket: TicketRecord,
	ticketTypeName: string,
	invitedUserIds: string[],
	selectedUserIds: string[],
	options?: {
		responseMode?: "reply" | "update-message";
	}
) {
	const removableUserIds = selectedUserIds.filter((userId) => invitedUserIds.includes(userId));

	if (removableUserIds.length === 0) {
		await respond(app, interaction, "Those users are not invited to this ticket.", options?.responseMode);
		return;
	}

	for (const userId of removableUserIds) {
		await revokeTicketParticipantAccess(app, ticket.channelId, userId);
	}

	await updateInvitedUserIds(
		app,
		ticket.channelId,
		invitedUserIds.filter((userId) => !removableUserIds.includes(userId))
	);
	const actor = getInteractionUser(interaction);
	const ticketLogContext = createTicketLogContext(ticket, ticketTypeName);

	for (const userId of removableUserIds) {
		void sendTicketLog(app, {
			kind: "userRemoved",
			actor,
			targetId: userId,
			ticket: ticketLogContext
		});
	}

	await respond(
		app,
		interaction,
		`Removed ${removableUserIds.map((userId) => `<@${userId}>`).join(", ")} from this ticket.`,
		options?.responseMode
	);
}

async function respond(
	app: ComponentExecutionContext["app"],
	interaction: APIChatInputApplicationCommandInteraction | APIMessageComponentInteraction,
	content: string,
	responseMode = "reply"
) {
	if (responseMode === "update-message" && interaction.type === 3) {
		await updateMessage(app, interaction, {
			content,
			components: []
		});
		return;
	}

	await reply(app, interaction, {
		content,
		flags: MessageFlags.Ephemeral
	});
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

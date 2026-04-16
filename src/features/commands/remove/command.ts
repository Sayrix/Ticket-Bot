import type { APIChatInputApplicationCommandInteraction, APIMessageComponentInteraction } from "@discordjs/core";
import { ComponentType, MessageFlags } from "@discordjs/core";
import { ApplicationCommandOptionType } from "discord-api-types/v10";
import { createCustomId } from "@/core/custom-id";
import { defineCommand } from "@/core/defineCommand";
import { reply, updateMessage } from "@/core/respond";
import type { ComponentExecutionContext } from "@/core/types";
import { getUserOption } from "@/features/commands/shared/options";
import { getInvitedUserIds, revokeTicketParticipantAccess, updateInvitedUserIds } from "@/features/tickets/participants";
import { getOpenTicketByChannel } from "@/features/tickets/records";

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
			await removeUsersFromTicket(app, interaction, invitedUserIds, openTicket.ticket.channelId, [selectedUser.userId]);
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

	await removeUsersFromTicket(context.app, interaction, invitedUserIds, openTicket.ticket.channelId, selectedUserIds, {
		responseMode: "update-message"
	});
}

async function removeUsersFromTicket(
	app: ComponentExecutionContext["app"],
	interaction: APIChatInputApplicationCommandInteraction | APIMessageComponentInteraction,
	invitedUserIds: string[],
	channelId: string,
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
		await revokeTicketParticipantAccess(app, channelId, userId);
	}

	await updateInvitedUserIds(
		app,
		channelId,
		invitedUserIds.filter((userId) => !removableUserIds.includes(userId))
	);

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

import { generateMessages } from "ticket-bot-transcript-uploader";
import zlib from "zlib";
import axios from "axios";
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Collection, ColorResolvable, CommandInteraction, ComponentType, EmbedBuilder, GuildMember, Message, ModalSubmitInteraction, TextChannel } from "discord.js";
import { log } from "./logs";
import {ExtendedClient, TicketType} from "../structure";
let domain = "https://ticket.pm/";

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

type ticketType = {
    id: number;
    channelid: string;
    messageid: string;
    category: string;
    invited: string;
    reason: string;
    creator: string;
    createdat: bigint;
    claimedby: string | null;
    claimedat: bigint | null;
    closedby: string | null;
    closedat: bigint | null;
    closereason: string | null;
    transcript: string | null;
}

export async function close(interaction: ButtonInteraction | CommandInteraction | ModalSubmitInteraction, client: ExtendedClient, reason?: string) {
	if (!client.config.closeOption.createTranscript) domain = client.locales.getSubValue("other","unavailable");

	const ticket = await client.prisma.tickets.findUnique({
		where: {
			channelid: interaction.channel?.id
		}
	});
	const ticketClosed = ticket?.closedat && ticket.closedby;
	if (!ticket) return interaction.editReply({ content: "Ticket not found" }).catch((e) => console.log(e));

	// @TODO: Breaking change refactor happens here as well..
	const ticketType = ticket ? JSON.parse(ticket.category) as TicketType : undefined;
	
	if (
		client.config.closeOption.whoCanCloseTicket === "STAFFONLY" &&
		!(interaction.member as GuildMember | null)?.roles.cache.some((r) => client.config.rolesWhoHaveAccessToTheTickets.includes(r.id) ||
		ticketType?.staffRoles?.includes(r.id))
	)
		return interaction
			.editReply({
				content: client.locales.getValue("ticketOnlyClosableByStaff")
			})
			.catch((e) => console.log(e));

	if (ticketClosed)
		return interaction
			.editReply({
				content: client.locales.getValue("ticketAlreadyClosed")
			})
			.catch((e) => console.log(e));

	log(
		{
			LogType: "ticketClose",
			user: interaction.user,
			ticketId: ticket.id,
			ticketChannelId: interaction.channel?.id,
			ticketCreatedAt: ticket.createdat,
			reason: reason
		},
		client
	);
	
	// Normally the user that closes the ticket will get posted here, but we'll do it when the ticket finalizes

	const creator = ticket.creator;
	const invited = JSON.parse(ticket.invited) as string[];

	(interaction.channel as TextChannel | null)?.permissionOverwrites
		.edit(creator, {
			ViewChannel: false
		})
		.catch((e: unknown) => console.log(e));
	invited.forEach(async (user) => {
		(interaction.channel as TextChannel | null)?.permissionOverwrites
			.edit(user, {
				ViewChannel: false
			})
			.catch((e) => console.log(e));
	});

	interaction
		.editReply({
			content: client.locales.getValue("ticketCreatingTranscript")
		})
		.catch((e) => console.log(e));
	async function _close(id: string, ticket: ticketType) {
		if (client.config.closeOption.closeTicketCategoryId) (interaction.channel as TextChannel | null)?.setParent(client.config.closeOption.closeTicketCategoryId).catch((e) => console.log(e));

		const msg = await interaction.channel?.messages.fetch(ticket.messageid);
		const embed = new EmbedBuilder(msg?.embeds[0].data);

		const rowAction = new ActionRowBuilder<ButtonBuilder>();
		msg?.components[0]?.components?.map((x) => {
			if(x.type !== ComponentType.Button) return;
			const builder = new ButtonBuilder(x.data);
			if (x.customId === "close") builder.setDisabled(true);
			if (x.customId === "close_askReason") builder.setDisabled(true);
			rowAction.addComponents(builder);
		});

		msg?.edit({
			content: msg.content,
			embeds: [embed],
			components: [rowAction]
		})
			.catch((e) => console.log(e));

		interaction.channel?.send({
			content: client.locales.getValue("ticketTranscriptCreated").replace(
				"TRANSCRIPTURL",
				domain === client.locales.getSubValue("other", "unavailable") ? client.locales.getSubValue("other", "unavailable") : `<${domain}${id}>`
			)
		}).catch((e) => console.log(e));
		
		ticket = await client.prisma.tickets.update({
			data: {
				closedby: interaction.user.id,
				closedat: Date.now(),
				closereason: reason,
				transcript: domain === client.locales.getSubValue("other", "unavailable") ? client.locales.getSubValue("other", "unavailable") : `${domain}${id}`
			},
			where: {
				channelid: interaction.channel?.id
			}
		});

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setCustomId("deleteTicket").setLabel(client.locales.getSubValue("other", "deleteTicketButtonMSG")).setStyle(ButtonStyle.Danger)
		);
		const locale = client.locales;
		interaction.channel?.send({
			embeds: [
				JSON.parse(
					JSON.stringify(locale.getSubRawValue("embeds", "ticketClosed"))
						.replace("TICKETCOUNT", ticket.id.toString())
						.replace("REASON", (ticket.closereason ?? client.locales.getSubValue("other", "noReasonGiven")).replace(/[\n\r]/g, "\\n"))
						.replace("CLOSERNAME", interaction.user.tag)
				)
			],
			components: [row]
		})
			.catch((e) => console.log(e));


		if(!client.config.closeOption.dmUser) return;
		const footer = locale.getSubValue("embeds", "ticketClosedDM", "footer", "text").replace("ticket.pm", "");
		const ticketClosedDMEmbed = new EmbedBuilder({
			color: 0,
		})
			.setColor(locale.getNoErrorSubValue("embeds", "ticketClosedDM", "color") as ColorResolvable ?? client.config.mainColor)
			.setDescription(
				client.locales.getSubValue("embeds", "ticketClosedDM", "description")
					.replace("TICKETCOUNT", ticket.id.toString())
					.replace("TRANSCRIPTURL", `${domain}${id}`)
					.replace("REASON", ticket.closereason ?? client.locales.getSubValue("other", "noReasonGiven"))
					.replace("CLOSERNAME", interaction.user.tag)
			)
			.setFooter({
				// Please respect the project by keeping the credits, (if it is too disturbing you can credit me in the "about me" of the bot discord)
				text: `ticket.pm ${footer.trim() !== "" ? `- ${footer}` : ""}`, // Please respect the LICENSE :D
				// Please respect the project by keeping the credits, (if it is too disturbing you can credit me in the "about me" of the bot discord)
				iconURL: locale.getNoErrorSubValue("embeds", "ticketClosedDM", "footer", "iconUrl")
			});

		client.users.fetch(creator).then((user) => {
			user
				.send({
					embeds: [ticketClosedDMEmbed]
				})
				.catch((e) => console.log(e));
		});
	}

	if (!client.config.closeOption.createTranscript) {
		_close("", ticket);
		return;
	}

	async function fetchAll() {
		const collArray: Collection<string, Message<true | false>>[] = [];
		let lastID = (interaction.channel as TextChannel | null)?.lastMessageId;
		// eslint-disable-next-line no-constant-condition
		while (true) {
			// using if statement for this check causes a TypeScript bug. Hard to reproduce; thus, bug report won't be accepted.
			if(!lastID) break;
			const fetched = await interaction.channel?.messages.fetch({ limit: 100, before: lastID });
			if (fetched?.size === 0) {
				break;
			}
			if(fetched)
				collArray.push(fetched);
			lastID = fetched?.last()?.id;
			if (fetched?.size !== 100) {
				break;
			}
		}
		const messages = collArray[0].concat(...collArray.slice(1));
		return messages;
	}

	const messages = await fetchAll();
	const premiumKey = "";

	const messagesJSON = await generateMessages(messages, premiumKey, "https://m.ticket.pm");
	zlib.gzip(JSON.stringify(messagesJSON), async (err, compressed) => {
		if (err) {
			console.error(err);
		} else {
			const ts = await axios
				.post(`${domain}upload?key=${premiumKey}&uuid=${client.config.uuidType}`, JSON.stringify(compressed), {
					headers: {
						"Content-Type": "application/json"
					}
				})
				.catch(console.error);
			_close(ts?.data, ticket);
		}
	});
}

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/

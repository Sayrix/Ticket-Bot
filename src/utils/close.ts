import { generateMessages } from "ticket-bot-transcript-uploader";
import zlib from "zlib";
import axios from "axios";
import { Collection, CommandInteraction, GuildMember, Message, ModalSubmitInteraction, TextChannel } from "discord.js";
import { DiscordClient } from "../Types";
import { log } from "./logs";
let domain = "https://ticket.pm/";

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
export async function close(interaction: ModalSubmitInteraction | CommandInteraction, client: DiscordClient, reason?: string) {
	if (!client.config.createTranscript) domain = client.locales.other.unavailable;

	const ticket = await client.db.get(`tickets_${interaction.channel?.id}`);
	if (!ticket) return interaction.editReply({ content: "Ticket not found" }).catch((e) => console.log(e));

	if (
		client.config.whoCanCloseTicket === "STAFFONLY" &&
		!(interaction.member as GuildMember | null)?.roles.cache.some((r) => client.config.rolesWhoHaveAccessToTheTickets.includes(r.id))
	)
		return interaction
			.editReply({
				content: client.locales.ticketOnlyClosableByStaff
			})
			.catch((e) => console.log(e));

	if (ticket.closed)
		return interaction
			.editReply({
				content: client.locales.ticketAlreadyClosed
			})
			.catch((e) => console.log(e));

	log(
		{
			LogType: "ticketClose",
			user: interaction.user,
			ticketId: ticket.id,
			ticketChannelId: interaction.channel?.id,
			ticketCreatedAt: ticket.createdAt,
			reason: reason
		},
		client
	);

	await client.db.set(`tickets_${interaction.channel?.id}.closedBy`, interaction.user.id);
	await client.db.set(`tickets_${interaction.channel?.id}.closedAt`, Date.now());

	if (reason) {
		await client.db.set(`tickets_${interaction.channel?.id}.closeReason`, reason);
	} else {
		await client.db.set(`tickets_${interaction.channel?.id}.closeReason`, client.locales.other.noReasonGiven);
	}

	const creator = await client.db.get(`tickets_${interaction.channel?.id}.creator`);
	const invited = await client.db.get(`tickets_${interaction.channel?.id}.invited`);

	(interaction.channel as TextChannel | null)?.permissionOverwrites
		.edit(creator, {
			ViewChannel: false
		})
		.catch((e: unknown) => console.log(e));
	// TODO: Replace user: string with the proper type once ORM is implemented
	invited.forEach(async (user: string) => {
		(interaction.channel as TextChannel | null)?.permissionOverwrites
			.edit(user, {
				ViewChannel: false
			})
			.catch((e) => console.log(e));
	});

	interaction
		.editReply({
			content: client.locales.ticketCreatingTranscript
		})
		.catch((e) => console.log(e));

	await interaction.channel?.messages.fetch();

	async function close(id: string) {
		if (client.config.closeTicketCategoryId) (interaction.channel as TextChannel | null)?.setParent(client.config.closeTicketCategoryId).catch((e) => console.log(e));

		const messageId = await client.db.get(`tickets_${interaction.channel?.id}.messageId`);
		const msg = interaction.channel?.messages.cache.get(messageId);
		const embed = msg?.embeds[0].data;

		msg?.components[0]?.components?.map((x) => {
			//@ts-ignore TODO: Remove this illegal usage without breaking code
			if (x.data.custom_id === "close") x.data.disabled = true;
			//@ts-ignore TODO: Remove this illegal usage without breaking code
			if (x.data.custom_id === "close_askReason") x.data.disabled = true;
		});

		msg?.edit({
			content: msg.content,
			//@ts-ignore TODO: Remove this illegal usage without breaking code
			embeds: [embed],
			components: msg.components
		})
			.catch((e) => console.log(e));

		await client.db.set(`tickets_${interaction.channel?.id}.closed`, true);

		interaction.channel?.send({
			content: client.locales.ticketTranscriptCreated.replace(
				"TRANSCRIPTURL",
				domain === client.locales.other.unavailable ? client.locales.other.unavailable : `<${domain}${id}>`
			)
		})
			.catch((e) => console.log(e));
		await client.db.set(
			`tickets_${interaction.channel?.id}.transcriptURL`,
			domain === client.locales.other.unavailable ? client.locales.other.unavailable : `${domain}${id}`
		);
		const ticket = await client.db.get(`tickets_${interaction.channel?.id}`);

		const row = new Discord.ActionRowBuilder().addComponents(
			new Discord.ButtonBuilder().setCustomId("deleteTicket").setLabel(client.locales.other.deleteTicketButtonMSG).setStyle(Discord.ButtonStyle.Danger)
		);
		const lEmbed = client.locales.embeds;
		interaction.channel?.send({
			embeds: [
				JSON.parse(
					JSON.stringify(lEmbed.ticketClosed)
						.replace("TICKETCOUNT", ticket.id)
						.replace("REASON", ticket.closeReason.replace(/[\n\r]/g, "\\n"))
						.replace("CLOSERNAME", interaction.user.tag)
				)
			],
			components: [row]
		})
			.catch((e) => console.log(e));

		const tiketClosedDMEmbed = new Discord.EmbedBuilder()
			.setColor(lEmbed.ticketClosedDM.color ? lEmbed.ticketClosedDM.color : client.config.mainColor)
			.setDescription(
				client.locales.embeds.ticketClosedDM.description
					.replace("TICKETCOUNT", ticket.id)
					.replace("TRANSCRIPTURL", `[\`${domain}${id}\`](${domain}${id})`)
					.replace("REASON", ticket.closeReason)
					.replace("CLOSERNAME", interaction.user.tag)
			)

		/*
		Copyright 2023 Sayrix (github.com/Sayrix)
					
		Licensed under the Apache License, Version 2.0 (the "License");
		you may not use this file except in compliance with the License.
		You may obtain a copy of the License at
					
			http://www.apache.org/licenses/LICENSE-2.0
					
		Unless required by applicable law or agreed to in writing, software
		distributed under the License is distributed on an "AS IS" BASIS,
		WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
		See the License for the specific language governing permissions and
		limitations under the License.
		*/

			.setFooter({
				// Please respect the project by keeping the credits, (if it is too disturbing you can credit me in the "about me" of the bot discord)
				text: "ticket.pm" + lEmbed.ticketClosedDM.footer.text.replace("ticket.pm", ""), // Please respect the LICENSE :D
				// Please respect the project by keeping the credits, (if it is too disturbing you can credit me in the "about me" of the bot discord)
				iconUrl: lEmbed.ticketClosedDM.footer.iconUrl
			});

		/*
		Copyright 2023 Sayrix (github.com/Sayrix)

		Licensed under the Apache License, Version 2.0 (the "License");
		you may not use this file except in compliance with the License.
		You may obtain a copy of the License at

			http://www.apache.org/licenses/LICENSE-2.0

		Unless required by applicable law or agreed to in writing, software
		distributed under the License is distributed on an "AS IS" BASIS,
		WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
		See the License for the specific language governing permissions and
		limitations under the License.
		*/

		client.users.fetch(creator).then((user) => {
			user
				.send({
					embeds: [tiketClosedDMEmbed]
				})
				.catch((e) => console.log(e));
		});
	}

	if (!client.config.createTranscript) {
		close("");
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
				.post(`${domain}upload?key=${premiumKey}`, JSON.stringify(compressed), {
					headers: {
						"Content-Type": "application/json"
					}
				})
				.catch(console.error);
			close(ts?.data);
		}
	});
}

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

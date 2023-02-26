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

module.exports = {
	async claim(interaction, client) {
		const ticket = await client.db.get(`tickets_${interaction.channel.id}`);
		if (!ticket)
			return interaction.reply({
				content: "Ticket not found",
				ephemeral: true,
			});

		const canClaim = interaction.member.roles.cache.some((r) =>
			client.config.rolesWhoHaveAccessToTheTickets.includes(r.id)
		);

		if (!canClaim)
			return interaction
				.reply({
					content: client.locales.ticketOnlyClaimableByStaff,
					ephemeral: true,
				})
				.catch((e) => console.log(e));

		if (interaction.user.id === ticket.creator)
			return interaction
				.reply({
					content: client.locales.ticketOnlyClaimableByStaff,
					ephemeral: true,
				})
				.catch((e) => console.log(e));

		if (ticket.claimed)
			return interaction
				.reply({
					content: client.locales.ticketAlreadyClaimed,
					ephemeral: true,
				})
				.catch((e) => console.log(e));

		client.log(
			"ticketClaim",
			{
				user: {
					tag: interaction.user.tag,
					id: interaction.user.id,
					avatarURL: interaction.user.displayAvatarURL(),
				},
				ticketId: ticket.id,
				ticketChannelId: interaction.channel.id,
				ticketCreatedAt: ticket.createdAt,
			},
			client
		);

		await client.db.set(`tickets_${interaction.channel.id}.claimed`, true);
		await client.db.set(
			`tickets_${interaction.channel.id}.claimedBy`,
			interaction.user.id
		);
		await client.db.set(
			`tickets_${interaction.channel.id}.claimedAt`,
			Date.now()
		);

		await interaction.channel.messages.fetch();
		const messageId = await client.db.get(
			`tickets_${interaction.channel.id}.messageId`
		);
		const msg = interaction.channel.messages.cache.get(messageId);

		const embed = msg.embeds[0].data;
		embed.description =
      embed.description +
      `\n\n ${client.locales.other.claimedBy.replace(
      	"USER",
      	`<@${interaction.user.id}>`
      )}`;

		msg.components[0].components.map((x) => {
			if (x.data.custom_id === "claim") x.data.disabled = true;
		});

		msg
			.edit({
				content: msg.content,
				embeds: [embed],
				components: msg.components,
			})
			.catch((e) => console.log(e));

		interaction
			.reply({
				content: client.locales.ticketClaimedMessage.replace(
					"USER",
					`<@${interaction.user.id}>`
				),
				ephemeral: false,
			})
			.catch((e) => console.log(e));
	},
};

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

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('claim')
		.setDescription('Set the ticket as claimed.'),
	async execute(interaction, client) {
    const ticket = await client.db.get(`tickets.${interaction.channel.id}`);
    if (!ticket) return interaction.reply({content: 'Ticket not found', ephemeral: true});

    const canClaim = interaction.member.roles.cache.some(r => client.config.rolesWhoHaveAccessToTheTickets.includes(r.id));

    if (!canClaim) return interaction.reply({
      content: client.locales.ticketOnlyClaimableByStaff,
      ephemeral: true
    });

    if (ticket.claimed) return interaction.reply({
      content: client.locales.ticketAlreadyClaimed,
      ephemeral: true
    });

    await client.db.set(`tickets.${interaction.channel.id}.claimed`, true);
    await client.db.set(`tickets.${interaction.channel.id}.claimedBy`, interaction.user.id);
    await client.db.set(`tickets.${interaction.channel.id}.claimedAt`, Date.now());

    interaction.channel.messages.fetch()
    const messageId = await client.db.get(`tickets.${interaction.channel.id}.messageId`)
    const msg = interaction.channel.messages.cache.get(messageId);

    const embed = msg.embeds[0].data;
    embed.description = embed.description + `\n\n ${client.locales.other.claimedBy.replace('USER', `<@${interaction.user.id}>`)}`;

    msg.components[0].components.map(x => {
      if (x.data.custom_id === 'claim') x.data.disabled = true;
    });

    msg.edit({
      content: msg.content,
      embeds: [embed],
      components: msg.components
    });

    interaction.reply({
      content: client.locales.ticketClaimedMessage,
      ephemeral: true
    });

    interaction.channel.send({
      content: `> Ticket claimed by ${interaction.user}`
    });
	},
};
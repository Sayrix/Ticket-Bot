module.exports = {
  async deleteTicket(interaction, client) {
    const ticket = await client.db.get(`tickets_${interaction.channel.id}`);
    if (!ticket) return interaction.reply({content: 'Ticket not found', ephemeral: true});

    client.log("ticketDelete", {
      user: {
        tag: interaction.user.tag,
        id: interaction.user.id,
        avatarURL: interaction.user.displayAvatarURL()
      },
      ticketId: ticket.id,
      ticketCreatedAt: ticket.createdAt,
      transcriptURL: ticket.transcriptURL
    }, client);

    await interaction.deferUpdate();
    interaction.channel.delete();
  }
};
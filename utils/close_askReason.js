module.exports = {
  async closeAskReason(interaction, client) {
    if (client.config.whoCanCloseTicket === 'STAFFONLY' && !interaction.member.roles.cache.some(r => client.config.rolesWhoHaveAccessToTheTickets.includes(r.id))) return interaction.reply({
      content: client.locales.ticketOnlyClosableByStaff,
      ephemeral: true
    }).catch(e => console.log(e));
    
    const modal = new client.discord.ModalBuilder()
    .setCustomId('askReasonClose')
    .setTitle(client.locales.modals.reasonTicketClose.title);

    const input = new client.discord.TextInputBuilder()
    .setCustomId('reason')
    .setLabel(client.locales.modals.reasonTicketClose.label)
    .setStyle(client.discord.TextInputStyle.Paragraph)
    .setPlaceholder(client.locales.modals.reasonTicketClose.placeholder)
    .setMaxLength(256);
        
    const firstActionRow = new client.discord.ActionRowBuilder().addComponents(input);
    modal.addComponents(firstActionRow);
    await interaction.showModal(modal).catch(e => console.log(e));
  }
}
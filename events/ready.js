module.exports = {
  name: 'ready',
  execute(client) {
    console.log('Ticket Bot ready!')
    console.log('Thank you very much for using Ticket Bot! Developed with the ❤️ by Sayrix');
    const oniChan = client.channels.cache.get(client.config.ticketChannel)

    function sendTicketMSG() {
      const embed = new client.discord.MessageEmbed()
        .setColor('6d6ee8')
        .setAuthor('Ticket', 'https://i.imgur.com/oO5ZSRK.png')
        .setDescription('Cliquez sur le bouton ci-dessous pour ouvrir un ticket')
        .setFooter('ExoHost.fr', 'https://i.imgur.com/oO5ZSRK.png')
      const row = new client.discord.MessageActionRow()
        .addComponents(
          new client.discord.MessageButton()
          .setCustomId('open-ticket')
          .setLabel('Ouvrir un ticket')
          .setEmoji('✉️')
          .setStyle('PRIMARY'),
        );

      oniChan.send({
        embeds: [embed],
        components: [row]
      })
    }

    oniChan.bulkDelete(100).then(() => {
      sendTicketMSG()
    })
  },
};
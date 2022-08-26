let hastebin = require('hastebin');

const {
  SlashCommandBuilder
} = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the ticket'),
  async execute(interaction, client) {
	  const chan = client.channels.cache.get(interaction.channelId);
	  if (chan.name.includes('ticket')) {
	    chan.messages.fetch().then(async (messages) => {
        let a = messages.filter(m => m.author.bot !== true).map(m =>
          `${new Date(m.createdTimestamp).toLocaleString('de-DE')} - ${m.author.username}#${m.author.discriminator}: ${m.attachments.size > 0 ? m.attachments.first().proxyURL : m.content}`
        ).reverse().join('\n');
        if (a.length < 1) a = "It was not written in the ticket"
        hastebin.createPaste(a, {
            contentType: 'text/plain',
            server: 'https://hastebin.com'
          }, {})
          .then(function (urlToPaste) {
            const embed = new client.discord.MessageEmbed()
              .setAuthor('Logs Ticket', ' ')
              .setDescription(`📰 Ticket-Logs \`${chan.id}\` created by <@!${chan.topic}> and deleted by <@!${interaction.user.id}>\n\nLogs: [**Click here to see the logs**](${urlToPaste})`)
              .setColor('2f3136')
              .setTimestamp();

            const embed2 = new client.discord.MessageEmbed()
              .setAuthor('Logs Ticket', ' ')
              .setDescription(`📰 Logs of your ticket \`${chan.id}\`: [**Click here to see the logs**](${urlToPaste})`)
              .setColor('2f3136')
              .setTimestamp();

            client.channels.cache.get(client.config.logsTicket).send({
              embeds: [embed]
            });
            client.users.cache.get(chan.topic).send({
              embeds: [embed2]
            }).catch(() => {console.log('Unable to send private message')});

            setTimeout(() => {
              chan.delete();
            }, 5000);
          });
      }).then(async () => {
        interaction.reply({
          content: `<@!${interaction.user.id}> has just closed the ticket`
        });
      });
    } else {
      interaction.reply({
        content: 'you dont have a ticket!',
        ephemeral: true
      });
	};
  },
}; 
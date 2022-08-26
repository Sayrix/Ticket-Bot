const {
  SlashCommandBuilder
} = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a user')
    .addUserOption(option =>
      option.setName('target')
      .setDescription('Remove a user from the ticket')
      .setRequired(true)),
  async execute(interaction, client) {
    const chan = client.channels.cache.get(interaction.channelId);
    const user = interaction.options.getUser('target');

    if (chan.name.includes('ticket')) {
      chan.edit({
        permissionOverwrites: [{
          id: user,
          deny: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
        },
        {
          id: interaction.guild.roles.everyone,
          deny: ['VIEW_CHANNEL'],
        },
          {
            id: client.config.roleSupport,
            allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
          },
      ],
      }).then(async () => {
        interaction.reply({
          content: `<@${user.id}> has just been removed from the channel.`
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

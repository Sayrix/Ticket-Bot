const {
  SlashCommandBuilder
} = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member.')
    .addUserOption(option =>
      option.setName('target')
      .setDescription('Kick member')
      .setRequired(true))
    .addStringOption(option =>
        option.setName('raison')
        .setDescription('reason to kick')
        .setRequired(false)),
  async execute(interaction, client) {
    const user = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.options.getUser('target').id);
    const executer = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.user.id);

    if (!executer.permissions.has(client.discord.Permissions.FLAGS.KICK_MEMBERS)) return interaction.reply({
      content: 'you dont have permission to this command! (`KICK_MEMBERS`)',
      ephemeral: true
    });

    if (user.roles.highest.rawPosition > executer.roles.highest.rawPosition) return interaction.reply({
      content: 'you cant kick this member',
      ephemeral: true
    });

    if (!user.kickable) return interaction.reply({
      content: 'i cant kick this member.',
      ephemeral: true
    });

    if (interaction.options.getString('raison')) {
      user.kick(interaction.options.getString('raison'))
      interaction.reply({
        content: `**${user.user.tag}** has ben kicked!`
      });
    } else {
      user.kick()
      interaction.reply({
        content: `**${user.user.tag}** has ben kicked!`
      });
    };
  },
};
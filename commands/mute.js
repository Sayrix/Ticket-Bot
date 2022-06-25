const {
    SlashCommandBuilder
  } = require('@discordjs/builders');
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('mute')
      .setDescription('mute a member.')
      .addUserOption(option =>
        option.setName('target')
        .setDescription('mute member')
        .setRequired(true))
      .addStringOption(option =>
        option.setName('raison')
        .setDescription('reason to mute')
        .setRequired(false)),
    async execute(interaction, client) {
      const user = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.options.getUser('target').id);
      const executer = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.user.id);
  
      if (!executer.permissions.has(client.discord.Permissions.FLAGS.BAN_MEMBERS)) return interaction.reply({
        content: 'you dont have permission to use this command! (`MUTE_MEMBERS`)',
        ephemeral: true
      });
  
      if (user.roles.highest.rawPosition > executer.roles.highest.rawPosition) return interaction.reply({
        content: 'you cant mute this member',
        ephemeral: true
      });
  
      if (!user.bannable) return interaction.reply({
        content: 'i cant mute this member.',
        ephemeral: true
      });
  
      if (interaction.options.getString('raison')) {
        user.mute({
          reason: interaction.options.getString('raison'),
          days: 1
        });
        interaction.reply({
          content: `**${user.user.tag}** has ben muted!`
        });
      } else {
        user.mute({
          days: 1
        });
        interaction.reply({
          content: `**${user.user.tag}** has ben muted!`
        });
      };
    },
  };
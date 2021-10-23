const {
  SlashCommandBuilder
} = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban une personne.')
    .addUserOption(option =>
      option.setName('target')
      .setDescription('Membre à ban')
      .setRequired(true))
    .addStringOption(option =>
      option.setName('raison')
      .setDescription('Raison du ban')
      .setRequired(false)),
  async execute(interaction, client) {
    const user = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.options.getUser('target').id);
    const executer = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.user.id);

    if (!executer.permissions.has(client.discord.Permissions.FLAGS.BAN_MEMBERS)) return interaction.reply({
      content: 'Vous n\'avez pas la permission requise pour éxecuter cette commande ! (`BAN_MEMBERS`)',
      ephemeral: true
    });

    if (user.roles.highest.rawPosition > executer.roles.highest.rawPosition) return interaction.reply({
      content: 'La personne que vous souhaitez ban est au dessus de vous !',
      ephemeral: true
    });

    if (!user.bannable) return interaction.reply({
      content: 'La personne que vous souhaitez ban est au dessus de moi ! Je ne peut donc pas le ban.',
      ephemeral: true
    });

    if (interaction.options.getString('raison')) {
      user.ban({
        reason: interaction.options.getString('raison'),
        days: 1
      });
      interaction.reply({
        content: `**${user.user.tag}** A été banni avec succès !`
      });
    } else {
      user.ban({
        days: 1
      });
      interaction.reply({
        content: `**${user.user.tag}** A été banni avec succès !`
      });
    };
  },
};
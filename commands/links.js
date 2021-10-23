const {
  SlashCommandBuilder
} = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('links')
    .setDescription('Donne tout les liens d\'ExoHost'),
  async execute(interaction, client) {
    const embed = new client.discord.MessageEmbed()
      .setColor('6d6ee8')
      .setAuthor('Liens', client.user.avatarURL())
      .setDescription('`💻` Site: [exohost.fr](https://exohost.fr/)\n`🎮` Panel de jeux: [panel.exohost.fr](https://panel.exohost.fr/)\n`🌐` Espace Client: [my.exohost.fr](https://my.exohost.fr/)\n\n`🐦` Twitter: [twitter.com/exohostfr](https://twitter.com/exohostfr)\n`⭐` Trustpilot: [trustpilot.com/review/exohost.fr](https://fr.trustpilot.com/review/exohost.fr)')
      .setFooter(client.config.footerText, client.user.avatarURL())
      .setTimestamp();

    await interaction.reply({
      embeds: [embed]
    });
  },
};
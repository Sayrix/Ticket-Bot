const {
  SlashCommandBuilder
} = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Donne les crédits du bot.'),
  async execute(interaction, client) {
    const embed = new client.discord.MessageEmbed()
      .setColor('6d6ee8')
      .setDescription('Développé avec le <:heart:901205849404493854> par Siri#1111\n\n[<:github:901207749675851816>](https://github.com/Sayrix)  [<:twitter:901207826729418752>](https://twitter.com/SayrixFX)  [<:twitch:901207801643303012>](https://www.twitch.tv/s4yrix)  [<:discord:901207777765130300>](https://discord.com/invite/VasYV6MEJy)')
      .setFooter(client.config.footerText, client.user.avatarURL())
      .setTimestamp();

    await interaction.reply({
      embeds: [embed]
    });
  },
};
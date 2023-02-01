const readline = require('readline');
const axios = require('axios');

module.exports = {
	name: 'ready',
	once: true,
	async execute(client) {
    await client.guilds.fetch(client.config.guildId)
    await client.guilds.cache.get(client.config.guildId).members.fetch()
    if (!client.guilds.cache.get(client.config.guildId).members.me.permissions.has("Administrator")) {
      console.log("\n⚠️⚠️⚠️ I don't have the Administrator permission, to prevent any issues please add the Administrator permission to me. ⚠️⚠️⚠️");
      process.exit(0);
    };

    async function sendEmbedToOpen() {
      const embedMessageId = await client.db.get("temp.openTicketMessageId");
      const openTicketChannel = await client.channels.fetch(client.config.openTicketChannelId).catch(e => console.error("The channel to open tickets is not found!\n", e));
      if (!openTicketChannel) {
        console.error("The channel to open tickets is not found!");
        return process.exit(0);
      }
      
      if (openTicketChannel.messages) {
        await openTicketChannel.messages.fetch(embedMessageId)
        .catch(e => console.error("Error when trying to fetch openTicketMessage:\n", e))
  
        try {if (embedMessageId) openTicketChannel.messages.cache.get(embedMessageId).delete();} catch (e) {console.error}
      };

      let embed = client.embeds.openTicket;

      embed.color = parseInt(client.config.mainColor, 16);
      // Please respect the project by keeping the credits, (if it is too disturbing you can credit me in the "about me" of the bot discord)
      embed.footer.text = "is.gd/ticketbot" + client.embeds.ticketOpened.footer.text.replace("is.gd/ticketbot", "") // Please respect the LICENSE :D
      // Please respect the project by keeping the credits, (if it is too disturbing you can credit me in the "about me" of the bot discord)

      const row = new client.discord.ActionRowBuilder()
			.addComponents(
				new client.discord.ButtonBuilder()
					.setCustomId('openTicket')
					.setLabel(client.locales.other.openTicketButtonMSG)
					.setStyle(client.discord.ButtonStyle.Primary),
			);

      try { openTicketChannel.send({
        embeds: [embed],
        components: [row]
      })
      .then(msg => {
        client.db.set("temp.openTicketMessageId", msg.id);
      }) } catch(e) {console.error}
    };

    sendEmbedToOpen();

    readline.cursorTo(process.stdout, 0);
	  process.stdout.write(`🚀  Ready! Logged in as \x1b[37;46;1mtest#0000\x1b[0m (\x1b[37;46;1m111111111111\x1b[0m)
    🌟  You can leave a star on GitHub: \x1b[37;46;1mhttps://github.com/Sayrix/ticket-bot \x1b[0m
    📖  Documentation: \x1b[37;46;1mhttps://ticket-bot.pages.dev \x1b[0m
    🪙  Be a sponsor starting at $1/month: \x1b[37;46;1mhttps://github.com/sponsors/Sayrix \x1b[0m\n`.replace(/\t/g, ''));

	  const a = await axios.get('https://raw.githubusercontent.com/Sayrix/sponsors/main/sponsors.json').catch(() => {});
	  if (a) {
	  	const sponsors = a.data;
	  	const sponsorsList = sponsors.map(s => `\x1b]8;;https://github.com/${s.sponsor.login}\x1b\\\x1b[1m${s.sponsor.login}\x1b]8;;\x1b\\\x1b[0m`).join(', ');
	  	process.stdout.write(`💖  Thanks to our sponsors: ${sponsorsList}`)
	  }
	},
};

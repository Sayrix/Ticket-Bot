module.exports = {
  async log(logsType, logs, client) {
    if (!client.config.logs) return;
    if (!client.config.logsChannelId) return;
    const channel = await client.channels.fetch(client.config.logsChannelId).catch(e => console.error("The channel to log events is not found!\n", e));
    if (!channel) return console.error("The channel to log events is not found!");

    let webhooks = await channel.fetchWebhooks()
    if (webhooks.size === 0) {
      await channel.createWebhook({ name: "Ticket Bot Logs"});
      webhooks = await channel.fetchWebhooks();
    }
    const webhook = webhooks.first();

    if (logsType === "ticketCreate") {
      const embed = new client.discord.EmbedBuilder()
      .setColor("3ba55c")
      .setAuthor({ name: logs.user.tag, iconURL: logs.user.avatarURL })
      .setDescription(`${logs.user.tag} (<@${logs.user.id}>) Created a ticket (<#${logs.ticketChannelId}>) with the reason: \`${logs.reason}\``);

      webhook.send({
        username: "Ticket Created",
        avatarURL: "https://i.imgur.com/M38ZmjM.png",
        embeds: [embed]
      });
    };

    if (logsType === "ticketClaim") {
      const embed = new client.discord.EmbedBuilder()
      .setColor("faa61a")
      .setAuthor({ name: logs.user.tag, iconURL: logs.user.avatarURL })
      .setDescription(`${logs.user.tag} (<@${logs.user.id}>) Claimed the ticket n°${logs.ticketId} (<#${logs.ticketChannelId}>) after ${client.msToHm(new Date(Date.now() - logs.ticketCreatedAt))} of creation`);

      webhook.send({
        username: "Ticket Claimed",
        avatarURL: "https://i.imgur.com/qqEaUyR.png",
        embeds: [embed]
      });
    };

    if (logsType === "ticketClose") {
      const embed = new client.discord.EmbedBuilder()
      .setColor("ed4245")
      .setAuthor({ name: logs.user.tag, iconURL: logs.user.avatarURL })
      .setDescription(`${logs.user.tag} (<@${logs.user.id}>) Closed the ticket n°${logs.ticketId} (<#${logs.ticketChannelId}>) with the reason: \`${logs.reason}\` after ${client.msToHm(new Date(Date.now() - logs.ticketCreatedAt))} of creation`);

      webhook.send({
        username: "Ticket Closed",
        avatarURL: "https://i.imgur.com/5ShDA4g.png",
        embeds: [embed]
      });
    };

    if (logsType === "ticketDelete") {
      const embed = new client.discord.EmbedBuilder()
      .setColor("ed4245")
      .setAuthor({ name: logs.user.tag, iconURL: logs.user.avatarURL })
      .setDescription(`${logs.user.tag} (<@${logs.user.id}>) Deleted the ticket n°${logs.ticketId} after ${client.msToHm(new Date(Date.now() - logs.ticketCreatedAt))} of creation\n\nTranscript: ${logs.transcriptURL}`);

      webhook.send({
        username: "Ticket Deleted",
        avatarURL: "https://i.imgur.com/obTW2BS.png",
        embeds: [embed]
      });
    }
  }
};
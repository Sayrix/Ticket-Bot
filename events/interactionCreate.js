const {PermissionFlagsBits} = require('discord.js');

module.exports = {
	name: 'interactionCreate',
	once: false,
  async execute(interaction, client) {
    async function createTicket(ticketType, reason) {
      const ticketName = client.config.ticketNameOption
      .replace('USERNAME', interaction.user.username)
      .replace('USERID', interaction.user.id)
      .replace('TICKETCOUNT', await client.db.get(`temp.ticketCount`) || 0);

      client.guilds.cache.get(client.config.guildId).channels.create({
        name: ticketName,
        parent: ticketType.categoryId,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone,
            deny: [PermissionFlagsBits.ViewChannel]
          }
        ]
      }).then(async channel => {
        await client.db.add(`temp.ticketCount`, 1);
        const ticketId = await client.db.get(`temp.ticketCount`);
        await client.db.set(`tickets.${channel.id}`, {
          id: ticketId-1,
          category: ticketType,
          reason: reason,
          creator: interaction.user.id,
          createdAt: Date.now(),
          claimed: false,
          claimedBy: null,
          claimedAt: null,
          closed: false,
          closedBy: null,
          closedAt: null
        });

        channel.permissionOverwrites.edit(interaction.user, {
          SendMessages: true,
          AddReactions: true,
          ReadMessageHistory: true,
          AttachFiles: true,
          ViewChannel: true,
        });

        if (client.config.rolesWhoHaveAccessToTheTickets.length > 0) {
          client.config.rolesWhoHaveAccessToTheTickets.forEach(async role => {
            channel.permissionOverwrites.edit(role, {
              SendMessages: true,
              AddReactions: true,
              ReadMessageHistory: true,
              AttachFiles: true,
              ViewChannel: true,
            });
          });
        };

        const ticketOpenedEmbed = new client.discord.EmbedBuilder()
        .setColor(ticketType.color ? ticketType.color : client.config.mainColor)
        .setTitle(client.embeds.ticketOpened.title.replace('CATEGORYNAME', ticketType.name))
        .setDescription(
          ticketType.customDescription ? ticketType.customDescription
          .replace('CATEGORYNAME', ticketType.name)
          .replace('REASON', reason) :
          client.embeds.ticketOpened.description
          .replace('CATEGORYNAME', ticketType.name)
          .replace('REASON', reason))
        .setFooter({
          text: "is.gd/ticketbot" + client.embeds.ticketOpened.footer.text.replace("is.gd/ticketbot", ""), // Please respect the LICENSE :D
          iconUrl: client.embeds.ticketOpened.footer.iconUrl
        });

        const row = new client.discord.ActionRowBuilder()

        if (client.config.closeButton) {
          row.addComponents(
            new client.discord.ButtonBuilder()
              .setCustomId('close')
              .setLabel(client.locales.buttons.close.label)
              .setEmoji(client.locales.buttons.close.emoji)
              .setStyle(client.discord.ButtonStyle.Danger),
          );
        };

        if (client.config.claimButton) {
          row.addComponents(
            new client.discord.ButtonBuilder()
              .setCustomId('claim')
              .setLabel(client.locales.buttons.claim.label)
              .setEmoji(client.locales.buttons.claim.emoji)
              .setStyle(client.discord.ButtonStyle.Primary),
          );
        };

        const body = {
          embeds: [ticketOpenedEmbed],
          content: `<@${interaction.user.id}> ${client.config.pingRoleWhenOpened ? `<@&${client.config.roleToPingWhenOpenedId}>` : ''}`,
        };

        if (row.components.length > 0) body.components = [row];

        channel.send(body).then((msg) => {
          msg.pin().then(() => {
            msg.channel.bulkDelete(1);
          });
          interaction.update({
            content: client.locales.ticketOpenedMessage.replace('TICKETCHANNEL', `<#${channel.id}>`),
            components: [],
            ephemeral: true
          });
        });
      });
    };

    if (interaction.isButton()) {
      if (interaction.customId === "openTicket") {
        // Make a select menus of all tickets types

        const row = new client.discord.ActionRowBuilder()
        .addComponents(
          new client.discord.SelectMenuBuilder()
            .setCustomId('selectTicketType')
            .setPlaceholder(client.locales.other.selectTicketTypePlaceholder)
            .setMaxValues(1)
            .addOptions(
              client.config.ticketTypes.map(x => {
                const options = new client.discord.SelectMenuOptionBuilder()
                options.setLabel(x.name)
                options.setValue(x.codeName)
                if (x.emoji) options.setEmoji(x.emoji)
                return options
              })
            ),
        );

        interaction.reply({
          ephemeral: true,
          components: [row]
        });
      };

      if (interaction.customId === "claim") {
        const ticket = await client.db.get(`tickets.${interaction.channel.id}`);
        if (!ticket) return console.error('Ticket not found in the database');

        // Do the ticket claimable only by staff

        if (interaction.user.id === ticket.creator) return interaction.reply({
          content: client.locales.ticketOnlyClaimableByStaff,
          ephemeral: true
        });

        client.db.set(`tickets.${interaction.channel.id}.claimed`, true);
        client.db.set(`tickets.${interaction.channel.id}.claimedBy`, interaction.user.id);
        client.db.set(`tickets.${interaction.channel.id}.claimedAt`, Date.now());

        const msg = interaction.message;
        const embed = msg.embeds[0].data;
        embed.description = embed.description + `\n\n ${client.locales.other.claimedBy.replace('USER', `<@${interaction.user.id}>`)}`;

        msg.components[0].components.map(x => {
          if (x.data.custom_id === 'claim') x.data.disabled = true;
        });

        interaction.message.edit({
          content: msg.content,
          embeds: [embed],
          components: msg.components
        });

        interaction.reply({
          content: client.locales.ticketClaimedMessage,
          ephemeral: true
        });

        interaction.channel.send({
          content: `> Ticket claimed by ${interaction.user}`
        });
      };
    };

    if (interaction.isSelectMenu()) {
      if (interaction.customId === "selectTicketType") {
        const ticketType = client.config.ticketTypes.find(x => x.codeName === interaction.values[0]);
        if (!ticketType) return console.error(`Ticket type ${interaction.values[0]} not found!`);
        if (ticketType.askReason) {
          const modal = new client.discord.ModalBuilder()
          .setCustomId('askReason')
          .setTitle(client.locales.modals.reasonTicketOpen.title);

          const input = new client.discord.TextInputBuilder()
          .setCustomId('input_'+interaction.values[0])
          .setLabel(client.locales.modals.reasonTicketOpen.label)
          .setStyle(client.discord.TextInputStyle.Paragraph)
          .setPlaceholder(client.locales.modals.reasonTicketOpen.placeholder)
          .setMaxLength(256);
          
          const firstActionRow = new client.discord.ActionRowBuilder().addComponents(input);
          modal.addComponents(firstActionRow);
          await interaction.showModal(modal);
        } else {
          createTicket(ticketType);
        };
      };
    };

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "askReason") {
        const type = interaction.fields.fields.first().customId.split('_')[1];
        const ticketType = client.config.ticketTypes.find(x => x.codeName === type);
        if (!ticketType) return console.error(`Ticket type ${interaction.values[0]} not found!`);
        createTicket(ticketType, interaction.fields.fields.first().value);
      };
    };
  },
};
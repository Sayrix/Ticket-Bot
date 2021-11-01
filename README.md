# Ticket Bot

Ticket Bot is a discord ticket bot with buttons made with Discord.js v13

![](https://i.imgur.com/XecyLJN.gif)

## How to install ?

You need to have Node.JS 16+
``````bash
git clone https://github.com/Sayrix/ticket-bot
cd ticket-bot
npm i
``````

## How to config ?

```json
//config.json
{
  "clientId": "id of the bot",


  "parentOpened": "id of the category when a ticket is opened",
  "parentTransactions": "id of the category when a ticket is an ticket transaction",
  "parentJeux": "id of the category when a ticket is an ticket jeux",
  "parentAutres": "id of the category when a ticket is an ticket autres",


  "roleSupport": "id of the role support",

  
  "logsTicket": "id of the channel of ticket logs",
  "ticketChannel": "id of the channel where is sended the embed to create a ticket",
  
  "footerText": "the footer of the embeds"
}
```

```json
//token.json
{
  "token": "token of your discord bot"
}
```

## How to start ?
```bash
node deploy-commands.js # To deploy s/ash commands
node index.js # To start the ticket-bot
```

## Many thanks to the people who will put a ⭐!

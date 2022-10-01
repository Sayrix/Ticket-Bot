const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('claim')
		.setDescription('Set the ticket as claimed.'),
	async execute(interaction, client) {
    const {claim} = require('../utils/claim.js');
    claim(interaction, client);
	},
};
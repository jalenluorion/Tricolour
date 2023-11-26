const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('isjophielsleeping')
    .setDescription('Is Jophiel sleeping?'),
  async execute(interaction) {
    var d = new Date();
    var n = d.getUTCHours();
    var m = d.getUTCMinutes();

    if (m < 10) {
      m = "0" + m;
    }

    var ampm = n >= 12 ? 'PM' : 'AM';
    if (n === 0) {
      n = 12; // Convert 0 to 12 AM
    } else if (n > 12) {
      n -= 12; // Convert to 12-hour format
    }
    // if it's between 11pm and 6am
    if (n >= 11 || n <= 6) {
      await interaction.reply({ content: `Yes, Jophiel is probably sleeping. It is ` + n + `:` + m + ` ` + ampm + ` in the UK.`});
    } else {
      await interaction.reply({ content: `No, Jophiel is probably awake. It is ` + n + `:` + m + ` ` + ampm + ` in the UK.`});
    }
  }
};
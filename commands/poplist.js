const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poplist')
    .setDescription('List the members in Tricolour.')
    .addIntegerOption(option =>
      option.setName('number')
        .setDescription('1: azure, 2: verdant, 3: scarlet')
        .setRequired(true)),
  async execute(interaction) {
    const number = interaction.options.getInteger('number');
    const azureRole = interaction.guild.roles.cache.get("1175866498804367430");
    const verdantRole = interaction.guild.roles.cache.get("1175866500834414623");
    const scarletRole = interaction.guild.roles.cache.get("1175866468018167808");

    const azureNum = azureRole.members.filter(member => member.user.tag != "Tricolour Bot#2125");
    const verdantNum = verdantRole.members.filter(member => member.user.tag != "Tricolour Bot#2125");
    const scarletNum = scarletRole.members.filter(member => member.user.tag != "Tricolour Bot#2125");

    if (number == 1) {
      const listMembers = azureNum.map(member => member.user.tag).join('\n');

      await interaction.reply({ content: `List of Azure members:\n\`\`\`\n${listMembers}\`\`\`` });
    }
    else if (number == 2) {
      const listMembers = verdantNum.map(member => member.user.tag).join('\n');
      await interaction.reply({ content: `List of Verdant members:\n\`\`\`\n${listMembers}\`\`\`` });
    }
    else if (number == 3) {
      const listMembers = scarletNum.map(member => member.user.tag).join('\n');
      await interaction.reply({ content: `List of Scarlet members:\n\`\`\`\n${listMembers}\`\`\`` });
    } 
    else {
      await interaction.reply({ content: `Invalid number!` });
    }
  }
};
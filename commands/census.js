const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('census')
    .setDescription('Conduct a quick census of Tricolour.'),
  async execute(interaction) {
    const azureRole = interaction.guild.roles.cache.get("1175866498804367430");
    const verdantRole = interaction.guild.roles.cache.get("1175866500834414623");
    const scarletRole = interaction.guild.roles.cache.get("1175866468018167808");

    const azureNum = azureRole.members.size;
    const verdantNum = verdantRole.members.size;
    const scarletNum = scarletRole.members.size;

    await interaction.reply({ content: `# Kingdom Of Tricolour Census\n## Total: ${azureNum + verdantNum + scarletNum - 2}\nAzure: ${azureNum}\nVerdant: ${verdantNum}\nScarlet: ${scarletNum}`});
  }
};
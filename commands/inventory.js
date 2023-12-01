const { SlashCommandBuilder } = require('@discordjs/builders');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Initialize auth - see https://theoephraim.github.io/node-google-spreadsheet/#/guides/authentication
const serviceAccountAuth = new JWT({
    // env var values here are copied from service account credentials generated by google
    // see "Authentication" section in docs for more info
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY,
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
    ],
});

const doc = new GoogleSpreadsheet('1rF8rinTzOqJhOyrxwb_cjrtahPEHRn7kPqEffSdKnQc', serviceAccountAuth);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Search the QM Hall inventory.')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item to search. Type ALL for all items, AVAILABLE for all available items.')
                .setRequired(true)),
    async execute(interaction) {
        const searchQuery = interaction.options.getString('item');

        await doc.loadInfo();
        const list = doc.sheetsByTitle['INVENTORY'];
        await list.loadCells();
        const totalRows = list.rowCount;

        var itemSheet = [];
        var itemSheetNum = [];

        for (let i = 1; i < totalRows; i++) {
            const cellValue = list.getCell(i, 0).value;
            const cellValueNum = list.getCell(i, 1).value;

            if (cellValue == null) {
                break;
            }
            itemSheet.push(cellValue);
            itemSheetNum.push(cellValueNum);
        }

        if (searchQuery.toLowerCase() == "all" || searchQuery.toLowerCase() == "available") {  
            if (searchQuery.toLowerCase() == "available") {
            itemSheet = itemSheet.filter(item => list.getCell(itemSheet.indexOf(item) + 1, 1).value > 0);
            itemSheetNum = itemSheetNum.filter(item => item > 0);
            }

            var itemSheetSplit = [];
            var itemSheetSplitString = "";
            for (let i = 0; i < itemSheet.length; i++) {
                itemSheetSplitString += itemSheet[i] + ": " + itemSheetNum[i] + "\n";
                if (itemSheetSplitString.length > 1900) {
                    itemSheetSplit.push(itemSheetSplitString);
                    itemSheetSplitString = "";
                }
            }
            if (itemSheetSplitString != ""){
                itemSheetSplit.push(itemSheetSplitString);
            }
            interaction.reply({ content: `List of all items:` });
            for (let i = 0; i < itemSheetSplit.length; i++) {
                await interaction.channel.send({ content: `\`\`\`\n${itemSheetSplit[i]}\`\`\`` });
            }
            return;
        }

        // try for both versions with and without the "s"
        var item = itemSheet.find(item => item.toLowerCase() === searchQuery.toLowerCase())
            || itemSheet.find(item => item.toLowerCase() === searchQuery.toLowerCase() + "s")
            || itemSheet.find(item => item.toLowerCase() === searchQuery.toLowerCase().slice(0, -1));

        if (item == null) {
            // find a list of items that contain the search query inside of it
            var itemContains = itemSheet.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()));
            if (itemContains.length == 0) {
                await interaction.reply({ content: `Item not found! Do you have the correct tense and spelling?` });
            }
            else {
                await interaction.reply({ content: `Item not found! Did you mean:\n\`\`\`\n${itemContains.join(`\n`)}\`\`\`` });
            }
        }
        else {
            var numAvailable = itemSheetNum[itemSheet.indexOf(item)];
            await interaction.reply({ content: `Item found! There are **${numAvailable}** ${item} in stock.` });
        }
    }
};
const dotenv = require('dotenv');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
dotenv.config();

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
    async validate(searchQuery) {
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

        // try for both versions with and without the "s"
        var item = itemSheet.find(item => item.toLowerCase() === searchQuery.toLowerCase())
            || itemSheet.find(item => item.toLowerCase() === searchQuery.toLowerCase() + "s")
            || itemSheet.find(item => item.toLowerCase() === searchQuery.toLowerCase().slice(0, -1));

        if (item == null) {
            return null;
        }
        else {
            return item;
        }
    },
    async execute(searchQuery) {
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

        // try for both versions with and without the "s"
        var item = itemSheet.find(item => item.toLowerCase() === searchQuery.toLowerCase())
            || itemSheet.find(item => item.toLowerCase() === searchQuery.toLowerCase() + "s")
            || itemSheet.find(item => item.toLowerCase() === searchQuery.toLowerCase().slice(0, -1));

        if (item == null) {
            return null;
        }
        else {
            var numAvailable = itemSheetNum[itemSheet.indexOf(item)];
            return numAvailable;
        }
    }
};
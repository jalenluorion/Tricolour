const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
var http = require('http');
const logger = require('./logger.js');
const dotenv = require('dotenv');
const { execute, validate } = require('./helpers/inventory.js');
dotenv.config();

http.createServer(function (req, res) {
  res.write("I'm alive");
  res.end();
}).listen(8080);

// Require the necessary discord.js classes
const {
  Client,
  Collection,
  GatewayIntentBits,
  ActivityType,
} = require('discord.js');

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessageTyping, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers]
});

// Loading commands from the commands folder
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

const TOKEN = process.env.TOKEN;

// Creating a collection for commands in client
client.commands = new Collection();

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
  client.commands.set(command.data.name, command);
}

// When the client is ready, run this code (only once)
client.once('ready', () => {

  logger.command('Ready!');
  const CLIENT_ID = client.user.id;
  const rest = new REST({
    version: '9'
  }).setToken(TOKEN);
  (async () => {
    try {
      // Registering the commands in the server
      await rest.put(
        Routes.applicationCommands(CLIENT_ID), {
        body: commands
      },
      );
      logger.command('Successfully registered application commands globally');

      // Set the bot's status
      client.user.setPresence({
        activities: [{ name: `a rugby game!`, type: ActivityType.Competing }],
        status: 'dnd',
      });
      logger.command('Successfully set bot status');
    } catch (error) {
      if (error) logger.error(error);
    }
  })();
});

// Interaction handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) {
    logger.command(`Non-command interaction called`);
    return;
  }
  const command = client.commands.get(interaction.commandName);
  try {
    logger.command(`Command ${interaction.commandName} called`);
    await command.execute(interaction);
  } catch (error) {
    if (error) logger.error(error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.content.includes('tricolour')) {
    //react red green blue circle emoji
    message.react('🔴');
    message.react('🟢');
    message.react('🔵');
  }
  if (message.content.toLowerCase().includes('jophiel')) {
    message.react('❤️');
    message.react('💚');
    message.react('💙');
  }

  const userName = message.author.username;
  const time = message.createdTimestamp;
  if (message.channel.id === '1180052378238582834') { // public
    const triggerMessage = message.content;
    const firstLine = triggerMessage.split('\n')[0];
    if (firstLine === "WITHDRAW"){
      const reason = triggerMessage.split('\n')[1];
      const newTriggerMessage = triggerMessage.split('\n').slice(2);
      
      const finalList = [];
      var error = "";
      for (const line of newTriggerMessage) {
        const lineArray = line.split(' - ');
        const available = await execute(lineArray[0]);
        const validated = await validate(lineArray[0]);

        const lineObject = {
          'Player Name': userName,
          'ITEM': validated,
          'QUANTITY': lineArray[1],
          'TYPE': 'WITHDRAW',
          'DAY': 7,
          'TIME (EST)': time,
          'NOTES': reason,
        };

        if (available == null) {
          error = error + lineArray[0] + " is not a valid item. Use \`/inventory ALL` to view all valid items.\n";
        }
        else if (available < lineArray[1]) {
          error = error + validated + ` does not have enough available. There is ${available} available.\n`;
        }
        finalList.push(lineObject);
      }

      if (error != "") {
        message.reply(error);
        return;
      }
      
      console.log(finalList);
    }
  } else if (message.channel.id === '1180408943013527552') { // private
    const triggerMessage = message.content;
  }
});

// Login to Discord with your client's token
client.login(TOKEN);

// // GOOGLE

// const { GoogleSpreadsheet } = require('google-spreadsheet');
// const { JWT } = require('google-auth-library');


// // Initialize auth - see https://theoephraim.github.io/node-google-spreadsheet/#/guides/authentication
// const serviceAccountAuth = new JWT({
//   // env var values here are copied from service account credentials generated by google
//   // see "Authentication" section in docs for more info
//   email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
//   key: process.env.GOOGLE_PRIVATE_KEY,
//   scopes: [
//     'https://www.googleapis.com/auth/spreadsheets',
//   ],
// });

// const doc = new GoogleSpreadsheet('1we_kiQW5s6KmC1NhN_IfUqR0sy43jRCZSRc_qAG5T94', serviceAccountAuth);

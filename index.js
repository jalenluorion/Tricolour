const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
var http = require('http');
const logger = require('./logger.js');
const dotenv = require('dotenv');
const { execute, validate } = require('./helpers/inventory.js');
const { name } = require('./helpers/user.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
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
    // PREPPING REQUEST
    const replyMessage = await message.reply("Submitting...");
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
        replyMessage.edit(error);
        return;
      }
      
      console.log(finalList);
      replyMessage.edit("Your request has been submitted. Please wait for a quartermaster to confirm your request.");

      // REQUEST SENT
      const userInfo = await name(userName);
      for (const item of finalList) {
        const QMChannel = client.channels.cache.get('1180408943013527552');
        // add a confirm deny and edit discord js button
        const confirm = new ButtonBuilder()
          .setStyle(ButtonStyle.Success)
          .setLabel('Accept')
          .setCustomId('accept');
        const deny = new ButtonBuilder()
          .setStyle(ButtonStyle.Danger)
          .setLabel('Deny')
          .setCustomId('deny');
        const edit = new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setLabel('Edit')
          .setCustomId('edit');
        const row = new ActionRowBuilder()
          .addComponents(confirm, deny, edit);
        const confirmDisabled = new ButtonBuilder()
          .setStyle(ButtonStyle.Success)
          .setLabel('Accept')
          .setCustomId('accept')
          .setDisabled(true);
        const denyDisabled = new ButtonBuilder()
          .setStyle(ButtonStyle.Danger)
          .setLabel('Deny')
          .setCustomId('deny')
          .setDisabled(true);
        const editDisabled = new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setLabel('Edit')
          .setCustomId('edit')
          .setDisabled(true);
        const rowDisabled = new ActionRowBuilder()
          .addComponents(confirmDisabled, denyDisabled, editDisabled);

        const QMMessage = await QMChannel.send({ content: `## WITHDRAWAL Request\nUser: <@${message.author.id}>\nContribution: ${userInfo.contribution}\nRegion: ${userInfo.region}\nReason: ${item['NOTES']}\n**${item['ITEM']} - ${item['QUANTITY']}**`, components: [row] });
        const filter = i => i.customId === 'accept' || i.customId === 'deny' || i.customId === 'edit';
        const collector = QMMessage.createMessageComponentCollector({ filter, time: 300000 });

        var responce = false;
        collector.on('collect', async i => {
          if (i.customId === 'accept') {
            responce = true;
            await i.update({ content: `## WITHDRAWAL Request - Accepted by <@${i.user.id}>\nUser: <@${message.author.id}>\nContribution: ${userInfo.contribution}\nRegion: ${userInfo.region}\nReason: ${item['NOTES']}\n**${item['ITEM']} - ${item['QUANTITY']}**`, components: [rowDisabled] });
            await message.reply({ content: 'Your WITHDRAWAL request of **' + item['QUANTITY'] + ' ' + item['ITEM'] + '** has been accepted. Make your way to the Quartermasters House now!'});
          }
          else if (i.customId === 'deny') {
            responce = true;
            await i.update({ content: `## WITHDRAWAL Request - Denied by <@${i.user.id}>\nUser: <@${message.author.id}>\nContribution: ${userInfo.contribution}\nRegion: ${userInfo.region}\nReason: ${item['NOTES']}\n**${item['ITEM']} - ${item['QUANTITY']}**`, components: [rowDisabled]});
            await i.followUp({ content: 'Provide a reason for denying this request.'});
            const filter = m => m.author.id === i.user.id;
            const collector = i.channel.createMessageCollector({ filter, time: 300000 });

            var responce2 = false;
            collector.on('collect', async m => {
              responce2 = true;
              await m.react('✅');
              await message.reply({ content: 'Your WITHDRAWAL request of **' + item['QUANTITY'] + ' ' + item['ITEM'] + '** has been denied. Reason: ' + m.content});
            });
            collector.on('end', async collected => {
              if (responce2 == false) {
                await message.reply({ content: 'Your WITHDRAWAL request of **' + item['QUANTITY'] + ' ' + item['ITEM'] + '** has been denied. Reason: None Specified'});
              }
              console.log(`Collected ${collected.size} items`);
            });
          }
          else if (i.customId === 'edit') {
            responce = true;
            await i.update({ content: `## WITHDRAWAL Request - Edited by <@${i.user.id}>
            \nUser: <@${message.author.id}>
            \nContribution: ${userInfo.contribution}\nRegion: ${userInfo.region}\nReason: ${item['NOTES']}\n**${item['ITEM']} - ${item['QUANTITY']}**`, components: [rowDisabled]});
            await i.followUp({ content: 'Provide a new quantity amount for this request'});
            const filter = m => m.author.id === i.user.id;
            const collector = i.channel.createMessageCollector({ filter, time: 300000 });

            var responce2 = false;
            collector.on('collect', async m => {
              responce2 = true;

              const acceptButton = new ButtonBuilder()
                .setStyle(ButtonStyle.Success)
                .setLabel('Accept')
                .setCustomId('userAccept');
              const denyButton = new ButtonBuilder()
                .setStyle(ButtonStyle.Danger)
                .setLabel('Deny')
                .setCustomId('userDeny');
              const newRow = new ActionRowBuilder()
                .addComponents(acceptButton, denyButton);

              await m.react('✅');
              await message.reply({ content: 'Your WITHDRAWAL request of **' + item['QUANTITY'] + ' ' + item['ITEM'] + '** has been edited to **' + m.content + '**. Please confirm the new quantity.', components: [newRow]});
              const filter = i => i.customId === 'userAccept' || i.customId === 'userDeny';
              const collector = i.channel.createMessageComponentCollector({ filter, time: 300000 });

              var responce3 = false;
              collector.on('collect', async i => {
                if (i.customId === 'userAccept') {
                  responce3 = true;
                  await i.update({ content: `## WITHDRAWAL Request - Accepted by <@${i}>\nUser: <@${message}>\nContribution: ${userInfo['contribution']}\nRegion: ${userInfo['region']}\nReason: ${item['NOTES']}\n**${item['ITEM']} - ${m.content}**`, components: [rowDisabled]});
                  await message.reply({ content: 'Your WITHDRAWAL request of **' + item['QUANTITY'] + ' ' + item['ITEM'] + '** has been edited to **' + m.content + '**'});
                }
                else if (i.customId === 'userDeny') {
                  responce3 = true;
                  await i.update({ content: `## WITHDRAWAL Request - Edited by <@${i}>\nUser: <@${message}>\nContribution: ${userInfo['contribution']}\nRegion: ${userInfo['region']}\nReason: ${item['NOTES']}\n**${item['ITEM']} - ${m.content}**`, components: [rowDisabled]});

                }
              }
            });
            collector.on('end', async collected => {
              if (responce2 == false) {
                await message.reply({ content: 'Your WITHDRAWAL request of **' + item['QUANTITY'] + ' ' + item['ITEM'] + '** has been edited to **' + item['QUANTITY'] + '**'});
              }
              console.log(`Collected ${collected.size} items`);
            });
          }
        });
        collector.on('end', collected => {
          if (responce == false) {
            QMMessage.edit({ content: `## WITHDRAWAL Request - Timed Out\nUser: <@${message.author.id}>
            \nContribution: ${userInfo.contribution}\nRegion: ${userInfo.region}\nReason: ${item['NOTES']}\n**${item['ITEM']} - ${item['QUANTITY']}**`, components: [rowDisabled] });
            message.reply({ content: 'Your request of **' + item['QUANTITY'] + ' ' + item['ITEM'] + '** has timed out. Please resubmit your request.'});
          }
          console.log(`Collected ${collected.size} items`);
        });
      }
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

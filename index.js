const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
var http = require('http');
const logger = require('./logger.js');
const dotenv = require('dotenv');
const { execute, validate } = require('./helpers/inventory.js');
const { name } = require('./helpers/user.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const dayjs = require('dayjs');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

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

client.on('messageCreate', async originalMessage => {
  if (originalMessage.author.bot) return;
  if (originalMessage.content.includes('tricolour')) {
    originalMessage.react('🔴');
    originalMessage.react('🟢');
    originalMessage.react('🔵');
  }
  if (originalMessage.content.toLowerCase().includes('jophiel')) {
    originalMessage.react('❤️');
    originalMessage.react('💚');
    originalMessage.react('💙');
  }

  const userName = originalMessage.author.username;
  const time = originalMessage.createdTimestamp;
  if (originalMessage.channel.id === '1180052378238582834') { // public
    // PREPPING REQUEST
    const triggerMessage = originalMessage.content;
    const firstLine = triggerMessage.split('\n')[0];
    if (firstLine === "WITHDRAW" || firstLine === "DEPOSIT") {
      const replyMessage = await originalMessage.reply("Submitting...");
      const reason = triggerMessage.split('\n')[1];
      const newTriggerMessage = triggerMessage.split('\n').slice(2);

      const finalList = [];
      var error = "";
      for (const line of newTriggerMessage) {
        const lineArray = line.split(' - ');
        const available = await execute(lineArray[0]);
        const validated = await validate(lineArray[0]);

        // i want MM/DD/YYYY HH:MM:SS
        const formattedTime = new Date(time);
        const newTime = dayjs(formattedTime).subtract(5, 'hour').format('MM/DD/YYYY HH:mm:ss');

        console.log(newTime);

        const lineObject = {
          'Player Name': userName,
          'ITEM': validated,
          'QUANTITY': lineArray[1],
          'TYPE': firstLine,
          'DAY': 8,
          'TIME (EST)': newTime,
          'NOTES': reason,
          'available': available,
        };

        if (available == null) {
          error = error + lineArray[0] + " is not a valid item. Use \`/inventory ALL` to view all valid items.\n";
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

        const QMMessage = await QMChannel.send({ content: `## ${firstLine} Request\nUser: <@${originalMessage.author.id}>\nContribution: ${userInfo.contribution}\nRegion: ${userInfo.region}\nReason: ${item['NOTES']}\n**${item['ITEM']} - ${item['QUANTITY']} / ${item['available']}**`, components: [row] });
        const filter = i => i.customId === 'accept' || i.customId === 'deny' || i.customId === 'edit';
        const actionButtons = QMMessage.createMessageComponentCollector({ filter, time: 600000 });

        var responce = false;
        actionButtons.on('collect', async buttonInteraction => {
          const qmUser = buttonInteraction.user.id;
          //add qmUser to the object
          item['Quartermaster'] = buttonInteraction.user.username;

          if (buttonInteraction.customId === 'accept') {
            responce = true;
            await buttonInteraction.update({ content: `## ${firstLine} Request - Accepted by <@${qmUser}>\nUser: <@${originalMessage.author.id}>\nContribution: ${userInfo.contribution}\nRegion: ${userInfo.region}\nReason: ${item['NOTES']}\n**${item['ITEM']} - ${item['QUANTITY']} / ${item['available']}**`, components: [rowDisabled] });
            await originalMessage.reply({ content: `Your ${firstLine} request of **` + item['QUANTITY'] + ` ` + item['ITEM'] + `** has been accepted. Make your way to the Quartermasters House now!` }, { components: [rowDisabled] });
            await addToSheet(item);
          }
          else if (buttonInteraction.customId === 'deny') {
            responce = true;
            await buttonInteraction.update({ content: `## ${firstLine} Request - Denied by <@${qmUser}>\nUser: <@${originalMessage.author.id}>\nContribution: ${userInfo.contribution}\nRegion: ${userInfo.region}\nReason: ${item['NOTES']}\n**${item['ITEM']} - ${item['QUANTITY']} / ${item['available']}**`, components: [rowDisabled] });
            await buttonInteraction.followUp({ content: `Provide a reason for denying this request.` });
            const filter = m => m.author.id === buttonInteraction.user.id;
            const denyReason = buttonInteraction.channel.createMessageCollector({ filter, time: 600000 });

            var responce2 = false;
            denyReason.on('collect', async responceMessage => {
              if (responce2 == true) {
                return;
              }
              responce2 = true;
              await responceMessage.react('✅');
              await originalMessage.reply({ content: `Your ${firstLine} request of **` + item['QUANTITY'] + ` ` + item['ITEM'] + `** has been denied. Reason: ` + responceMessage.content });
            });
            denyReason.on('end', async collected => {
              if (responce2 == false) {
                await originalMessage.reply({ content: `Your ${firstLine} request of **` + item['QUANTITY'] + ` ` + item['ITEM'] + `** has been denied. Reason: None Specified` });
              }
              console.log(`Collected ${collected.size} items`);
            });
          }
          else if (buttonInteraction.customId === 'edit') {
            responce = true;
            await buttonInteraction.update({ content: `## ${firstLine} Request - Edited by <@${qmUser}>\nUser: <@${originalMessage.author.id}>\nContribution: ${userInfo.contribution}\nRegion: ${userInfo.region}\nReason: ${item['NOTES']}\n**${item['ITEM']} - ${item['QUANTITY']} / ${item['available']}**`, components: [rowDisabled] });
            await buttonInteraction.followUp({ content: 'Provide a new quantity amount for this request' });
            const filter = m => m.author.id === buttonInteraction.user.id;
            const quantityCollector = buttonInteraction.channel.createMessageCollector({ filter, time: 600000 });

            var responce2 = false;
            quantityCollector.on('collect', async responceMessage => {
              if (responce2 == true) {
                return;
              }
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
              const acceptButtonDisabled = new ButtonBuilder()
                .setStyle(ButtonStyle.Success)
                .setLabel('Accept')
                .setCustomId('userAccept')
                .setDisabled(true);
              const denyButtonDisabled = new ButtonBuilder()
                .setStyle(ButtonStyle.Danger)
                .setLabel('Deny')
                .setCustomId('userDeny')
                .setDisabled(true);
              const newRowDisabled = new ActionRowBuilder()
                .addComponents(acceptButtonDisabled, denyButtonDisabled);

              await responceMessage.react('✅');
              await QMMessage.edit({ content: `## ${firstLine} Request - Edited by <@${qmUser}>\nUser: <@${originalMessage.author.id}>\nContribution: ${userInfo['contribution']}\nRegion: ${userInfo['region']}\nReason: ${item['NOTES']}\n**${item['ITEM']} - ${responceMessage.content} / ${item['available']} (EDITED)**`, components: [rowDisabled] });
              const confirmation = await originalMessage.reply({ content: `Your ${firstLine} request of **` + item['QUANTITY'] + ` ` + item['ITEM'] + `** has been edited to **` + responceMessage.content + `**. Please confirm the new quantity.`, components: [newRow] });
              const filter = i => i.customId === 'userAccept' || i.customId === 'userDeny';
              const confirmationButton = confirmation.createMessageComponentCollector({ filter, time: 600000 });

              var responce3 = false;
              confirmationButton.on('collect', async buttonInteraction => {
                if (buttonInteraction.user.id != originalMessage.author.id) {
                  await buttonInteraction.reply({ content: 'You cannot accept or deny this request. You are not the original requester.', ephemeral: true });
                  return;
                }
                if (buttonInteraction.customId === 'userAccept') {
                  responce3 = true;
                  await QMMessage.reply({ content: `The edited request has been accepted by the requester. <@${qmUser}>` });
                  await buttonInteraction.update({ content: `Your edited ${firstLine} request of **` + responceMessage.content + ` ` + item['ITEM'] + `** has been accepted. Make your way to the Quartermasters House now!`, components: [newRowDisabled] });
                  item['QUANTITY'] = responceMessage.content;
                  await addToSheet(item);
                }
                else if (buttonInteraction.customId === 'userDeny') {
                  responce3 = true;
                  await QMMessage.reply({ content: `The edited request has been denied by the reqester. <@${qmUser}>` });
                  await buttonInteraction.update({ content: `Your edited ${firstLine} request of **` + responceMessage.content + ` ` + item['ITEM'] + `** has been denied.`, components: [newRowDisabled] });
                }
              });
              confirmationButton.on('end', async collected => {
                if (responce3 == false) {
                  await QMMessage.edit({ content: `## ${firstLine} Request - Timed Out\nUser: <@${originalMessage.author.id}>\nContribution: ${userInfo['contribution']}\nRegion: ${userInfo['region']}\nReason: ${item['NOTES']}\n**${item['ITEM']} - ${responceMessage.content} / ${item['available']} (EDITED)**`, components: [rowDisabled] });
                  await confirmation.edit({ content: `Your edited ${firstLine} request of **` + responceMessage.content + ` ` + item['ITEM'] + `** has timed out. Please resubmit your request.`, components: [rowDisabled] });
                }
                console.log(`Collected ${collected.size} items`);
              });
            });
            quantityCollector.on('end', async collected => {
              if (responce2 == false) {
                await QMMessage.edit({ content: `## ${firstLine} Request - Timed Out\nUser: <@${originalMessage.author.id}>\nContribution: ${userInfo['contribution']}\nRegion: ${userInfo['region']}\nReason: ${item['NOTES']}\n**${item['ITEM']} - ${item['QUANTITY']} / ${item['available']}**`, components: [rowDisabled] });
                await originalMessage.reply({ content: `Your ${firstLine} request of **` + item['QUANTITY'] + ` ` + item['ITEM'] + `** has timed out. Please resubmit your request.` });
              }
              console.log(`Collected ${collected.size} items`);
            });
          }
        });
        actionButtons.on('end', collected => {
          if (responce == false) {
            QMMessage.edit({ content: `## ${firstLine} Request - Timed Out\nUser: <@${originalMessage.author.id}>\nContribution: ${userInfo.contribution}\nRegion: ${userInfo.region}\nReason: ${item['NOTES']}\n**${item['ITEM']} - ${item['QUANTITY']} / ${item['available']}**`, components: [rowDisabled] });
            originalMessage.reply({ content: `Your request of **` + item['QUANTITY'] + ` ` + item['ITEM'] + `** has timed out. Please resubmit your request.` });
          }
          console.log(`Collected ${collected.size} items`);
        });
      }
    }
  } else if (originalMessage.channel.id === '1180408943013527552') { // private
    const triggerMessage = originalMessage.content;
    const firstLine = triggerMessage.split('\n')[0];
    if (firstLine === "WITHDRAW" || firstLine === "DEPOSIT") {
      const replyMessage = await originalMessage.reply("Submitting...");
      const otherUser = triggerMessage.split('\n')[1];
      const confirmedUser = await name(otherUser);
      const reason = triggerMessage.split('\n')[2];
      const newTriggerMessage = triggerMessage.split('\n').slice(3);

      const finalList = [];
      var error = "";
      for (const line of newTriggerMessage) {
        const lineArray = line.split(' - ');
        const available = await execute(lineArray[0]);
        const validated = await validate(lineArray[0]);

        const formattedTime = new Date(time);
        const newTime = dayjs(formattedTime).subtract(5, 'hour').format('MM/DD/YYYY HH:mm:ss');

        const lineObject = {
          'Quartermaster': userName,
          'Player Name': confirmedUser.minecraftIGN,
          'ITEM': validated,
          'QUANTITY': lineArray[1],
          'TYPE': firstLine,
          'DAY': 8,
          'TIME (EST)': newTime,
          'NOTES': reason,
          'available': available,
        };

        if (available == null) {
          error = error + lineArray[0] + " is not a valid item. Use \`/inventory ALL` to view all valid items.\n";
        }
        if (confirmedUser == null) {
          error = error + otherUser + " is not a valid user. Use \`/user <username>` to view all valid users.\n";
        }
        finalList.push(lineObject);
      }

      if (error != "") {
        replyMessage.edit(error);
        return;
      }

      console.log(finalList);
      replyMessage.edit("Your request has been submitted and logged.");
      for (const item of finalList) {
        await addToSheet(item);
      }
    }
  }
});

async function addToSheet(object) {
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });

  const doc = new GoogleSpreadsheet('1rF8rinTzOqJhOyrxwb_cjrtahPEHRn7kPqEffSdKnQc', serviceAccountAuth);

  await doc.loadInfo();
  const list = doc.sheetsByTitle['INPUTBOT'];
  await list.loadCells();

  // add the object to the next blank row
  const totalRows = list.rowCount;

  for (let i = 1; i < totalRows; i++) {
    if (list.getCell(i, 0).value != null){
      continue;
    }
    list.getCell(i, 0).value = object['Quartermaster'];
    list.getCell(i, 1).value = object['Player Name'];
    list.getCell(i, 2).value = object['ITEM'];
    list.getCell(i, 3).value = object['QUANTITY'];
    list.getCell(i, 4).value = object['TYPE'];
    list.getCell(i, 5).value = object['DAY'];
    list.getCell(i, 6).value = object['TIME (EST)'];
    list.getCell(i, 7).value = object['NOTES'];
    await list.saveUpdatedCells();
    break;
  }
}

// Login to Discord with your client's token
client.login(TOKEN);
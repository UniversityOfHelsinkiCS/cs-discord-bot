const { ChannelType, MessageFlags } = require("discord.js");
const { logError } = require("./logger");

const validateChannel = (channel) => {
  if (channel.parent) return false;
  else if (channel.name !== "commands") return false;
  else if (channel.type !== ChannelType.GuildText) return false;
  else return true;
};

const sendPullDateMessage = async (client) => {
  const commandsChannel = client.guild.channels.cache.find((c) => validateChannel(c));
  await commandsChannel.send(`Latest version pulled on ${new Date()}`);
};

const sendErrorReport = async (interaction, client, error) => {
  const commandsChannel = client.guild.channels.cache.find((c) => validateChannel(c));
  const member = client.guild.members.cache.get(interaction.member.user.id);
  const channel = client.guild.channels.cache.get(interaction.channelId);
  const msg = `**ERROR DETECTED!**\nMember: ${member.displayName}\nCommand: ${interaction.commandName}\nChannel: ${channel.name}`;
  await commandsChannel.send({ content: msg });
  await commandsChannel.send({ content: error });
};

const sendErrorReportNoInteraction = async (telegramId, member, channel, client, error) => {
  const commandsChannel = client.guild.channels.cache.find((c) => validateChannel(c));
  const msg = `**ERROR DETECTED!**\nMember: ${member}\nChannel: ${channel}`;
  await commandsChannel.send({ content: msg });
  await commandsChannel.send({ content: error });
};

const sendErrorEphemeral = async (interaction, msg) => {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content: `Error: ${msg}` });
  } else {
    await interaction.reply({ content: `Error: ${msg}`, flags: MessageFlags.Ephemeral });
  }
};

const sendEphemeral = async (interaction, msg) => {
  await interaction.reply({ content: `${msg}`, flags: MessageFlags.Ephemeral });
};

const editEphemeral = async (interaction, msg) => {
  await interaction.editReply({ content: `${msg}` });
};

const editEphemeralWithComponents = async (interaction, msg, components) => {
  return await interaction.editReply({ content: `${msg}`, components: [components] });
};

const editEphemeralClearComponents = async (interaction, msg) => {
  await interaction.editReply({ content: `${msg}`, components: [] });
};
const editErrorEphemeral = async (interaction, msg) => {
  await interaction.editReply({ content: `Error: ${msg}` });
};

const sendReplyMessage = async (message, channel, replyText) => {
  const interactionId = message.id;
  const reply = await message.reply({ content: `${replyText}` });
  setTimeout(async () => {
    try {
      const fetchedReply = await channel.messages.fetch(reply.id);
      fetchedReply.delete();
    } catch (e) {
      logError(e);
      // console.log(error);
    }
    try {
      const fetchedInteraction = await channel.messages.fetch(interactionId);
      fetchedInteraction.delete();
    } catch (e) {
      logError(e);
      // console.log(error);
    }
  }, 86400000);
};

const sendReportToCommandsChannel = async (client, content, files = []) => {
  const commandsChannel = client.guild.channels.cache.find((c) => validateChannel(c));
  await commandsChannel.send({ content, files });
};

const sendFollowUpEphemeral = async (interaction, msg) => {
  await interaction.followUp({ content: `${msg}`, flags: MessageFlags.Ephemeral });
};

const replyInChunks = async (interaction, text, chunkSize = 1000) => {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) chunks.push(text.substring(i, i + chunkSize));
  await editEphemeral(interaction, chunks[0] ?? "Done.");
  for (const chunk of chunks.slice(1)) await sendFollowUpEphemeral(interaction, chunk);
};

module.exports = {
  sendPullDateMessage,
  sendErrorReport,
  sendReportToCommandsChannel,
  sendErrorEphemeral,
  sendErrorReportNoInteraction,
  sendEphemeral,
  editEphemeral,
  editEphemeralWithComponents,
  editEphemeralClearComponents,
  editErrorEphemeral,
  sendReplyMessage,
  sendFollowUpEphemeral,
  replyInChunks
};

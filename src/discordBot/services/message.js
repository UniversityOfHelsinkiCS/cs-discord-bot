const { ChannelType, MessageFlags } = require("discord.js");
const { describeInteraction } = require("./logger");

const MESSAGE_LIMIT = 2000;

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
  const { action, channelName } = describeInteraction(client, interaction);
  const msg = `**ERROR DETECTED!**\nMember: ${interaction.member?.displayName}\nCommand: ${action}\nChannel: ${channelName}`;
  await commandsChannel.send({ content: msg });
  await commandsChannel.send({ content: error.slice(0, MESSAGE_LIMIT) });
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
  sendEphemeral,
  editEphemeral,
  editEphemeralWithComponents,
  editEphemeralClearComponents,
  editErrorEphemeral,
  sendFollowUpEphemeral,
  replyInChunks
};

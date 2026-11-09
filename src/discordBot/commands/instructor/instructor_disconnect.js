const { SlashCommandBuilder } = require("discord.js");
const { getChannelByDiscordId } = require("../../../db/services/channelService");
const { findUserByDiscordId } = require("../../../db/services/userService");
const { sendEphemeral, editEphemeral, editErrorEphemeral } = require("../../services/message");
const { confirmChoice } = require("../../services/confirm");
const { findCourseMember } = require("../../../db/services/courseMemberService");
const { getUserWithUserId } = require("../../services/service");

const MENTION_PATTERN = /<@!?(\d+)>/;

const canDisconnect = async (discordId, courseId, models) => {
  const user = await findUserByDiscordId(discordId, models.User);
  if (!user) return false;
  if (user.admin || user.faculty) return true;
  if (!courseId) return false;
  const courseMember = await findCourseMember(user.id, courseId, models.CourseMember);
  return Boolean(courseMember?.instructor);
};

const execute = async (interaction, client, models) => {
  await sendEphemeral(interaction, "Disconnecting user from voice channel...");

  const parameter = interaction.options.getString("user");
  const mention = parameter.match(MENTION_PATTERN);
  if (!mention) {
    return await editErrorEphemeral(interaction, "Invalid parameters.");
  }

  const userToDc = await getUserWithUserId(client.guild, mention[1]).catch(() => null);
  if (!userToDc?.voice.channelId) {
    return await editErrorEphemeral(interaction, "That user is not in a voice channel.");
  }

  const voiceChannel = await getChannelByDiscordId(userToDc.voice.channelId, models.Channel);
  if (!(await canDisconnect(interaction.user.id, voiceChannel?.courseId, models))) {
    return await editErrorEphemeral(interaction, "You don't have the permissions to do that.");
  }

  const confirm = await confirmChoice(interaction, `Confirm command: Disconnect user ${mention[0]} from voice channel`);
  if (!confirm) {
    return await editEphemeral(interaction, "Command declined");
  }

  await userToDc.voice.disconnect();
  return await editEphemeral(interaction, `Disconnected user ${mention[0]} from voice channel`);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("instructor_disconnect")
    .setDescription("Disconnect user from voice channel.")
    .addStringOption((option) => option.setName("user").setDescription("User to disconnect.").setRequired(true)),
  execute,
  usage: "/instructor_disconnect",
  description: "Disconnect user from voice channel.*"
};

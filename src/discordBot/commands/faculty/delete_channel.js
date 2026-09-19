const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { requireFaculty } = require("../../services/permissions");
const { getCourseNameFromCategory } = require("../../services/service");
const {
  removeChannelFromDb,
  findChannelFromDbByName,
  findChannelsByCourse
} = require("../../../db/services/channelService");
const { findCourseFromDb } = require("../../../db/services/courseService");
const { respondWithChoices } = require("../../services/autocomplete");
const { sendEphemeral, editEphemeral, editErrorEphemeral } = require("../../services/message");
const { confirmChoice } = require("../../services/confirm");
const { facultyRole } = require("../../../../config.json");

const execute = async (interaction, client, models) => {
  if (!(await requireFaculty(interaction, models))) return;

  await sendEphemeral(interaction, "Deleting text channel...");
  const channelModel = models.Channel;
  const courseModel = models.Course;
  const deleteName = interaction.options.getString("channel").toLowerCase().trim().replace(/ /g, "-");
  const guild = client.guild;
  const channel = guild.channels.cache.get(interaction.channelId);

  if (!channel.parent) {
    return await editErrorEphemeral(interaction, "Course not found, can not delete channel.");
  }

  const parentChannel = await findCourseFromDb(getCourseNameFromCategory(channel.parent.name), courseModel);

  if (!parentChannel) {
    return await editErrorEphemeral(interaction, "This command can be used only in course channels");
  }

  const deleteChannelName = `${parentChannel.name}_${deleteName}`.toLowerCase();

  if (deleteName === "general" || deleteName === "announcement" || deleteName === "voice") {
    return await editErrorEphemeral(interaction, "Original channels can not be deleted.");
  }

  const confirm = await confirmChoice(interaction, "Confirm command: Delete channel " + deleteChannelName);

  if (!confirm) {
    return await editEphemeral(interaction, "Command declined");
  }

  const channelFromDb = await findChannelFromDbByName(deleteChannelName, channelModel);
  if (!channelFromDb) {
    return await editErrorEphemeral(interaction, "There is no added channel with given name.");
  }

  await removeChannelFromDb(deleteChannelName, channelModel);

  if (channel.name != deleteChannelName) {
    return await editEphemeral(interaction, `${deleteName} deleted!`);
  }
};

const autocomplete = async (interaction, client, models) => {
  const discordChannel = client.guild.channels.cache.get(interaction.channelId);
  if (!discordChannel?.parent) return await respondWithChoices(interaction, []);

  const course = await findCourseFromDb(getCourseNameFromCategory(discordChannel.parent.name), models.Course);
  if (!course) return await respondWithChoices(interaction, []);

  const channels = await findChannelsByCourse(course.id, models.Channel);
  const deletableNames = channels
    .filter((channel) => !channel.defaultChannel)
    .map((channel) => channel.name.slice(`${course.name}_`.length))
    .sort((a, b) => a.localeCompare(b));
  await respondWithChoices(
    interaction,
    deletableNames.map((name) => ({ name, value: name }))
  );
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("delete_channel")
    .setDescription("Delete given text channel from course.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option.setName("channel").setDescription("Delete given text channel").setRequired(true).setAutocomplete(true)
    ),
  execute,
  autocomplete,
  usage: "/delete_channel [channel name]",
  description: "Delete given text channel from course.*",
  roles: ["admin", facultyRole]
};

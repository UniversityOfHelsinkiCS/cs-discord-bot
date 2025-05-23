const { SlashCommandBuilder } = require("@discordjs/builders");
const { sendEphemeral, editEphemeral } = require("../../services/message");
const { confirmChoice } = require("../../services/confirm");
const { facultyRole } = require("../../../../config.json");
const { findCourseFromDb } = require("../../../db/services/courseService");
const { sendMessageToTelegram } = require("../../../telegramBot/bridge/service");


const execute = async (interaction, client, models) => {
  if (!interaction.member.permissions.has("ADMINISTRATOR") && !interaction.member.roles.cache.some(r => r.name === facultyRole)) {
    await sendErrorEphemeral(interaction, "You do not have permission to use this command.");
    return
  }

  await sendEphemeral(interaction, "Deleting bridge...");
  const Course = models.Course;
  const courseName = interaction.options.getString("course").trim();


  const confirm = await confirmChoice(interaction, "Delete the bridge to Telegram on course: " + courseName);
  if (!confirm) {
    return await editEphemeral(interaction, "Command declined");
  }

  const databaseValue = await findCourseFromDb(courseName, Course);
  if (!databaseValue) {
    return await editEphemeral(interaction, `Invalid course name: ${courseName}`);
  }
  if (!databaseValue.telegramId) {
    return await editEphemeral(interaction, `Course ${databaseValue.name} does not have a Telegram bridge!`);
  }

  await sendMessageToTelegram(databaseValue.telegramId, "The bridge has been deleted", null, "");
  databaseValue.telegramId = null;
  await databaseValue.save();

  return await editEphemeral(interaction, `Deleted Telegram bridge from course: ${databaseValue.name}`);
};


module.exports = {
  data: new SlashCommandBuilder()
    .setName("delete_bridge")
    .setDescription("Delete the bridge to the assigned Telegram group of this course")
    .setDefaultPermission(false)
    .addStringOption(option =>
      option.setName("course")
        .setDescription("Delete bridge of given course")
        .setRequired(true)),
  execute,
  usage: "/delete_bridge",
  description: "Delete the bridge to the assigned Telegram group of this course",
  roles: ["admin", facultyRole],
};
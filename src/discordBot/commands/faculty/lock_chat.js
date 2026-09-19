const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { requireFaculty } = require("../../services/permissions");
const { msToMinutesAndSeconds, handleCooldown, checkCourseCooldown } = require("../../services/service");
const { findCourseFromDb, findUnlockedCoursesFromDb } = require("../../../db/services/courseService");
const { setCourseToLocked } = require("../../../db/services/courseService");
const { sendEphemeral, editEphemeral, editErrorEphemeral } = require("../../services/message");
const { respondWithCourses } = require("../../services/autocomplete");
const { confirmChoice } = require("../../services/confirm");
const { facultyRole } = require("../../../../config.json");

const execute = async (interaction, client, models) => {
  if (!(await requireFaculty(interaction, models))) return;

  await sendEphemeral(interaction, "Locking course...");
  const courseName = interaction.options.getString("course").trim();
  const guild = client.guild;

  const confirm = await confirmChoice(interaction, "Lock course: " + courseName);
  if (!confirm) {
    return await editEphemeral(interaction, "Command declined");
  }

  const categoryInstance = await findCourseFromDb(courseName, models.Course);
  if (!categoryInstance || categoryInstance.locked) {
    return await editErrorEphemeral(interaction, `Invalid course name: ${courseName} or the course is locked already!`);
  }
  const cooldown = checkCourseCooldown(courseName);
  if (cooldown) {
    const timeRemaining = Math.floor(cooldown - Date.now());
    const time = msToMinutesAndSeconds(timeRemaining);
    return await editErrorEphemeral(interaction, `Command cooldown [mm:ss]: you need to wait ${time}!`);
  } else {
    await setCourseToLocked(courseName, models.Course, guild);
    await editEphemeral(interaction, `This course ${courseName} is now locked.`);
    handleCooldown(courseName);
  }
};

const autocomplete = async (interaction, client, models) => {
  const courses = await findUnlockedCoursesFromDb("code", models.Course);
  await respondWithCourses(interaction, courses);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lock_chat")
    .setDescription("Lock chat in given course")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option.setName("course").setDescription("Lock chat in given course").setRequired(true).setAutocomplete(true)
    ),
  execute,
  autocomplete,
  usage: "/lock_chat [course name]",
  description: "Lock given course.",
  roles: ["admin", facultyRole]
};

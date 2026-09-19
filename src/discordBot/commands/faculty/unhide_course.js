const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { requireFaculty } = require("../../services/permissions");
const { msToMinutesAndSeconds, handleCooldown, checkCourseCooldown } = require("../../services/service");
const { setCourseToPublic, findCourseFromDb, findPrivateCoursesFromDb } = require("../../../db/services/courseService");
const { editEphemeral, editErrorEphemeral, sendEphemeral } = require("../../services/message");
const { respondWithCourses } = require("../../services/autocomplete");
const { confirmChoice } = require("../../services/confirm");
const { facultyRole } = require("../../../../config.json");

const execute = async (interaction, client, models) => {
  if (!(await requireFaculty(interaction, models))) return;

  await sendEphemeral(interaction, "Unhiding course...");
  const courseName = interaction.options.getString("course").trim();

  const confirm = await confirmChoice(interaction, "Unhide course: " + courseName);
  if (!confirm) {
    return await editEphemeral(interaction, "Command declined");
  }

  const categoryInstance = await findCourseFromDb(courseName, models.Course);
  if (!categoryInstance || !categoryInstance.private) {
    return await editErrorEphemeral(interaction, `Invalid course name: ${courseName} or the course is public already!`);
  }

  const cooldown = checkCourseCooldown(courseName);
  if (cooldown) {
    const timeRemaining = Math.floor(cooldown - Date.now());
    const time = msToMinutesAndSeconds(timeRemaining);
    return await editErrorEphemeral(interaction, `Command cooldown [mm:ss]: you need to wait ${time}!`);
  } else {
    await editEphemeral(interaction, `This course ${courseName} is now public.`);
    await setCourseToPublic(courseName, models.Course);
    handleCooldown(courseName);
  }
};

const autocomplete = async (interaction, client, models) => {
  const courses = await findPrivateCoursesFromDb("fullName", models.Course);
  await respondWithCourses(interaction, courses);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unhide_course")
    .setDescription("Unhide course")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option.setName("course").setDescription("Unhide given course").setRequired(true).setAutocomplete(true)
    ),
  execute,
  autocomplete,
  usage: "/unhide_course [course name]",
  description: "Unhide course.",
  roles: ["admin", facultyRole]
};

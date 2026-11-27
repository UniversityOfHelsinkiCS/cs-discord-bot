const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { removeCourseFromDb, findCourseFromDb, findCoursesFromDb } = require("../../../db/services/courseService");
const { findAllCourseMembers } = require("../../../db/services/courseMemberService");
const { removeUserIfUnused } = require("../../../db/services/userService");
const { confirmChoice } = require("../../services/confirm");
const { respondWithCourses } = require("../../services/autocomplete");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral, editErrorEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  await sendEphemeral(interaction, "Deleting course...");
  if (!(await requireAdmin(interaction, models))) return;

  const courseName = interaction.options.getString("course_name").trim();

  const confirm = await confirmChoice(interaction, "Delete course: " + courseName);
  if (!confirm) {
    return;
  }

  const course = await findCourseFromDb(courseName, models.Course);
  if (!course) return await editErrorEphemeral(interaction, `Invalid course name: ${courseName}.`);

  const members = await findAllCourseMembers(course.id, models.CourseMember);
  await removeCourseFromDb(courseName, models.Course);
  for (const { userId } of members) {
    await removeUserIfUnused(userId, models.User, models.CourseMember);
  }

  return await editEphemeral(interaction, `Deleted course ${courseName}.`);
};

const autocomplete = async (interaction, client, models) => {
  const courses = await findCoursesFromDb("fullName", models.Course);
  await respondWithCourses(interaction, courses);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("delete_course")
    .setDescription("Delete course.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("course_name")
        .setDescription("The name of the course to delete")
        .setRequired(true)
        .setAutocomplete(true)
    ),
  execute,
  autocomplete,
  usage: "/delete_course [course name]",
  description: "Delete course.",
  roles: ["admin"]
};

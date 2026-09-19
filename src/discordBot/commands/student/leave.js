const { SlashCommandBuilder } = require("discord.js");
const { findCourseFromDb, findCoursesFromDb } = require("../../../db/services/courseService");
const { editEphemeral, editErrorEphemeral, sendEphemeral } = require("../../services/message");
const { respondWithCourses } = require("../../services/autocomplete");
const { findUserByDiscordId } = require("../../../db/services/userService");
const { removeCourseMemberFromDb, findAllCourseMembersByUser } = require("../../../db/services/courseMemberService");

const execute = async (interaction, client, models) => {
  await sendEphemeral(interaction, "Leaving course...");
  const roleString = interaction.options.getString("course").trim();

  const course = await findCourseFromDb(roleString, models.Course);
  if (!course) {
    return await editErrorEphemeral(interaction, `Invalid course name: ${roleString}`);
  }

  const user = await findUserByDiscordId(interaction.member.user.id, models.User);
  const courseMembers = await findAllCourseMembersByUser(user.id, models.CourseMember);
  const courseMember = courseMembers.find((cm) => cm.courseId === course.id);

  if (!courseMember) {
    return await editErrorEphemeral(interaction, `You are not on the ${roleString} course.`);
  }

  if (courseMember.instructor) {
    return await editErrorEphemeral(
      interaction,
      `You are an instructor on ${roleString}. Ask a faculty member to remove your instructor role with /remove_instructors before you can leave.`
    );
  }

  await removeCourseMemberFromDb(user.id, course.id, models.CourseMember);

  await editEphemeral(interaction, `You have been removed from the ${roleString} course.`);
};

const autocomplete = async (interaction, client, models) => {
  const user = await findUserByDiscordId(interaction.user.id, models.User);
  const memberships = user ? await findAllCourseMembersByUser(user.id, models.CourseMember) : [];
  const joinedCourseIds = memberships.map((membership) => membership.courseId);
  const courses = await findCoursesFromDb("code", models.Course);
  await respondWithCourses(
    interaction,
    courses.filter((course) => joinedCourseIds.includes(course.id))
  );
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Leave the course.")
    .addStringOption((option) =>
      option.setName("course").setDescription("Course to leave.").setRequired(true).setAutocomplete(true)
    ),
  execute,
  autocomplete,
  usage: "/leave",
  description: "Leave the course. After writing '/leave', the bot will give you a list of courses to choose from"
};

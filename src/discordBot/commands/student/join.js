const { SlashCommandBuilder } = require("discord.js");
const { editEphemeral, editErrorEphemeral, sendEphemeral } = require("../../services/message");
const { respondWithCourses } = require("../../services/autocomplete");
const { findCourseFromDb, findPublicCoursesFromDb } = require("../../../db/services/courseService");
const { createUserToDatabase } = require("../../../db/services/userService");
const {
  createCourseMemberToDatabase,
  findAllCourseMembersByUser
} = require("../../../db/services/courseMemberService");

const execute = async (interaction, client, models) => {
  await sendEphemeral(interaction, "Joining course...");
  const roleString = interaction.options.getString("course").trim();

  const course = await findCourseFromDb(roleString, models.Course);
  if (!course || course.private) {
    return await editErrorEphemeral(interaction, `Invalid course name: ${roleString}`);
  }

  const user = await createUserToDatabase(interaction.member.user.id, interaction.member.user.username, models.User);

  const courseMembers = await findAllCourseMembersByUser(user.id, models.CourseMember);
  const coursesJoinedByUser = courseMembers.map((cm) => cm.courseId);

  if (coursesJoinedByUser.includes(course.id)) {
    return await editErrorEphemeral(interaction, `You are already on the ${roleString} course.`);
  }

  await createCourseMemberToDatabase(user.id, course.id, models.CourseMember);
  await editEphemeral(interaction, `You have been added to the ${roleString} course.`);
};

const autocomplete = async (interaction, client, models) => {
  const courses = await findPublicCoursesFromDb("fullName", models.Course);
  await respondWithCourses(interaction, courses);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("join")
    .setDescription("Join a course.")
    .addStringOption((option) =>
      option.setName("course").setDescription("Course to join.").setRequired(true).setAutocomplete(true)
    ),
  execute,
  autocomplete,
  usage: "/join",
  description: "Join a course. After writing '/join', the bot will give you a list of courses to choose from"
};

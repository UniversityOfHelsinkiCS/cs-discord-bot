const { SlashCommandBuilder } = require("@discordjs/builders");
const { containsEmojis } = require("../../services/service");
const {
  createCourseToDatabase,
  findCourseFromDb,
  findCourseFromDbWithFullName } = require("../../../db/services/courseService");
const { sendErrorEphemeral, sendEphemeral, editEphemeral } = require("../../services/message");
const { courseAdminRole, facultyRole } = require("../../../../config.json");
const { createCourseMemberToDatabase, findCourseMember } = require("../../../db/services/courseMemberService");
const { findUserByDiscordId } = require("../../../db/services/userService");

const execute = async (interaction, client, models) => {
  if (!interaction.member.permissions.has("ADMINISTRATOR") && !interaction.member.roles.cache.some(r => r.name === facultyRole)) {
    await sendErrorEphemeral(interaction, "You do not have permission to use this command.");
    return
  }

  const courseCode = interaction.options.getString("coursecode").replace(/\s/g, "");
  const courseFullName = interaction.options.getString("full_name").trim();
  if (await findCourseFromDbWithFullName(courseFullName, models.Course)) return await sendErrorEphemeral(interaction, "Course fullname must be unique.");

  let courseName;
  let errorMessage;
  if (!interaction.options.getString("nick_name")) {
    courseName = courseCode.toLowerCase();
    errorMessage = "Course code must be unique.";
  }
  else {
    courseName = interaction.options.getString("nick_name").replace(/\s/g, "").toLowerCase();
    errorMessage = "Course nick name must be unique.";
  }

  if (containsEmojis(courseCode) || containsEmojis(courseFullName) || containsEmojis(courseName)) {
    return await sendErrorEphemeral(interaction, "Emojis are not allowed!");
  }

  const courseNameConcat = courseCode + " - " + courseFullName + " - " + courseName;
  if (courseNameConcat.length >= 99) {
    return await sendErrorEphemeral(interaction, "Course code, name and nickname are too long!");
  }

  if (await findCourseFromDb(courseName, models.Course)) return await sendErrorEphemeral(interaction, errorMessage);
  await sendEphemeral(interaction, "Creating course...");

  await createCourseToDatabase(courseCode, courseFullName, courseName, models.Course);
  await editEphemeral(interaction, `Created course ${courseName}. Adding you as an instructor to the course.`);

  //Adding user as a member of the course
  console.log("Adding user as a member of course")
  const course = await findCourseFromDb(courseName, models.Course);
  const user = await findUserByDiscordId(interaction.member.user.id, models.User);
  await createCourseMemberToDatabase(user.id, course.id, models.CourseMember);

  //Modifying user to be an instructor of the course
  courseMember = await findCourseMember(user.id, course.id, models.CourseMember);
  courseMember.instructor = true;
  await courseMember.save();
  const instructorRole = await interaction.guild.roles.cache.find(r => r.name === `${courseName} ${courseAdminRole}`);
  await interaction.member.roles.add(instructorRole);

  //Generating final ephemeral message with #channel link in the message 
  const channels = await interaction.guild.channels.fetch();
  const courseChannel = channels.find(
  c => c.name === `${courseName}_general` && c.type === "GUILD_TEXT"
  );
  let channelLink = "";
  if (courseChannel) {
    channelLink = `<#${courseChannel.id}>`;
  }
  await editEphemeral(interaction, `Created course ${courseName}. You have been added as an instructor of the course. You can find the course by clicking: ${channelLink || "Channel not found."} or among the listed courses on the sidebar.`);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("create_course")
    .setDescription("Create a new course.")
    .setDefaultPermission(false)
    .addStringOption(option =>
      option.setName("coursecode")
        .setDescription("Course coursecode")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("full_name")
        .setDescription("Course full name")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("nick_name")
        .setDescription("Course nick name")
        .setRequired(false)),
  execute,
  usage: "/create_course [course name]",
  description: "Create a new course.",
  roles: ["admin", facultyRole],
};

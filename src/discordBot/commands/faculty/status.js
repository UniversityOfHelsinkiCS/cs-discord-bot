const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { requireFaculty } = require("../../services/permissions");
const {
  getCourseNameFromCategory,
  createCourseInvitationLink,
  listCourseInstructors,
  isCourseCategory
} = require("../../services/service");
const { findCourseFromDb } = require("../../../db/services/courseService");
const { editErrorEphemeral, sendEphemeral, editEphemeral } = require("../../services/message");
const { facultyRole } = require("../../../../config.json");
const { findAllCourseMembers } = require("../../../db/services/courseMemberService");

const execute = async (interaction, client, models) => {
  await sendEphemeral(interaction, "Fetching status...");
  if (!(await requireFaculty(interaction, models))) return;
  const guild = client.guild;
  const channel = guild.channels.cache.get(interaction.channelId);

  if (!(await isCourseCategory(channel?.parent, models.Course))) {
    return await editErrorEphemeral(interaction, "This is not a course category, can not execute the command!");
  }

  const courseRole = getCourseNameFromCategory(channel.parent, guild);
  const course = await findCourseFromDb(courseRole, models.Course);

  const members = await findAllCourseMembers(course.id, models.CourseMember);
  const count = members.length;

  let instructors = await listCourseInstructors(courseRole, models);
  if (instructors === "") {
    instructors = `No instructors for ${courseRole}`;
  }

  return await editEphemeral(
    interaction,
    `
Course: ${course.name}
Fullname: ${course.fullName}
Code: ${course.code}
Hidden: ${course.private}
Invitation Link: ${createCourseInvitationLink(course.name)}

Instructors: ${instructors}
Members: ${count}
  `
  );
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Get full status of course.*")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute,
  usage: "/status",
  description: "Get full status of course.*",
  roles: ["admin", facultyRole]
};

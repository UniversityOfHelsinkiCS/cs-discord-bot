const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { requireFaculty } = require("../../services/permissions");
const {
  getCourseNameFromCategory,
  updateAnnouncementChannelMessage,
  getUserWithUserId
} = require("../../services/service");
const { parseUserMentions, formatMentions } = require("../../services/mentions");
const { createUserToDatabase } = require("../../../db/services/userService");
const { findCourseFromDb } = require("../../../db/services/courseService");
const { createCourseMemberToDatabase } = require("../../../db/services/courseMemberService");
const { editEphemeral, editErrorEphemeral, sendEphemeral } = require("../../services/message");
const { courseAdminRole, facultyRole } = require("../../../../config.json");

const fetchMember = async (guild, userId) => {
  try {
    return await getUserWithUserId(guild, userId);
  } catch {
    return null;
  }
};

const execute = async (interaction, client, models) => {
  await sendEphemeral(interaction, "Adding instructors...");
  if (!(await requireFaculty(interaction, models))) return;

  const guild = client.guild;
  const channel = guild.channels.cache.get(interaction.channelId);

  if (!channel.parent) {
    return await editErrorEphemeral(interaction, "Course not found, execution stopped.");
  }

  const parentCourse = await findCourseFromDb(getCourseNameFromCategory(channel.parent.name), models.Course);

  if (!parentCourse) {
    return await editErrorEphemeral(interaction, "Command must be used in a course channel!");
  }

  const instructorRole = guild.roles.cache.find((r) => r.name === `${parentCourse.name} ${courseAdminRole}`);
  if (!instructorRole) {
    return await editErrorEphemeral(interaction, "The instructor role of this course is missing.");
  }

  const userIds = parseUserMentions(interaction.options.getString("list"));
  if (userIds.length === 0) {
    return await editErrorEphemeral(interaction, "Mention the users to add with @.");
  }

  const notOnServer = [];
  const membersToPromote = [];
  for (const userId of userIds) {
    const member = await fetchMember(guild, userId);
    if (!member) notOnServer.push(userId);
    else if (!member.user.bot) membersToPromote.push(member);
  }

  if (membersToPromote.length === 0) {
    return await editErrorEphemeral(interaction, `None of the listed users can be added: ${formatMentions(userIds)}`);
  }

  for (const member of membersToPromote) {
    const userInstance = await createUserToDatabase(member.user.id, member.user.username, models.User);
    const courseMemberInstance = await createCourseMemberToDatabase(
      userInstance.id,
      parentCourse.id,
      models.CourseMember
    );
    courseMemberInstance.instructor = true;
    await courseMemberInstance.save();
    await member.roles.add(instructorRole);
  }

  const announcementChannel = guild.channels.cache.find((c) => c.name === `${parentCourse.name}_announcement`);
  await updateAnnouncementChannelMessage(guild, announcementChannel, models);

  if (notOnServer.length) {
    return await editEphemeral(
      interaction,
      `Gave role '${instructorRole.name}' to ${formatMentions(membersToPromote.map((m) => m.user.id))}.\nNot on the server, skipped: ${formatMentions(notOnServer)}`
    );
  }
  return await editEphemeral(interaction, `Gave role '${instructorRole.name}' to all users listed.`);
};
module.exports = {
  data: new SlashCommandBuilder()
    .setName("add_instructors")
    .setDescription("Add instructors to the course.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("list")
        .setDescription("List all users you wish to add as instructors using @tags")
        .setRequired(true)
    ),
  execute,
  usage: "/add_instructors [members]",
  description: "Add instructors to the course.*",
  roles: ["admin", facultyRole]
};

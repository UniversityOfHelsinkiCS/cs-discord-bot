const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { requireFaculty } = require("../../services/permissions");
const {
  getCourseNameFromCategory,
  updateAnnouncementChannelMessage,
  getUserWithUserId
} = require("../../services/service");
const { parseUserMentions, formatMentions } = require("../../services/mentions");
const { findUserByDiscordId } = require("../../../db/services/userService");
const { findCourseFromDb } = require("../../../db/services/courseService");
const { findCourseMember } = require("../../../db/services/courseMemberService");
const { editEphemeral, editErrorEphemeral, sendEphemeral } = require("../../services/message");
const { courseAdminRole, facultyRole } = require("../../../../config.json");

const fetchMember = async (guild, userId) => {
  try {
    return await getUserWithUserId(guild, userId);
  } catch {
    return null;
  }
};

const findMembership = async (userId, courseId, models) => {
  const userInstance = await findUserByDiscordId(userId, models.User);
  return userInstance && (await findCourseMember(userInstance.id, courseId, models.CourseMember));
};

const execute = async (interaction, client, models) => {
  await sendEphemeral(interaction, "Removing instructors...");
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
    return await editErrorEphemeral(interaction, "Mention the users to remove with @.");
  }

  const notOnServer = [];
  const notMembers = [];
  const demotions = [];
  for (const userId of userIds) {
    const member = await fetchMember(guild, userId);
    if (!member) {
      notOnServer.push(userId);
      continue;
    }
    if (member.user.bot) continue;
    const membership = await findMembership(userId, parentCourse.id, models);
    if (membership) demotions.push({ member, membership });
    else notMembers.push(userId);
  }

  if (notMembers.length) {
    return await editErrorEphemeral(
      interaction,
      `All listed users must be members of this course! Not members: ${formatMentions(notMembers)}`
    );
  }

  if (demotions.length === 0) {
    return await editErrorEphemeral(
      interaction,
      `None of the listed users are on the server: ${formatMentions(userIds)}`
    );
  }

  for (const { member, membership } of demotions) {
    membership.instructor = false;
    await membership.save();
    await member.roles.remove(instructorRole);
  }

  const announcementChannel = guild.channels.cache.find((c) => c.name === `${parentCourse.name}_announcement`);
  await updateAnnouncementChannelMessage(guild, announcementChannel, models);

  if (notOnServer.length) {
    return await editEphemeral(
      interaction,
      `Removed role '${instructorRole.name}' from ${formatMentions(demotions.map(({ member }) => member.user.id))}.\nNot on the server, skipped: ${formatMentions(notOnServer)}`
    );
  }
  return await editEphemeral(interaction, `Removed role '${instructorRole.name}' from all users listed.`);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove_instructors")
    .setDescription("Remove instructors from the course.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("list")
        .setDescription("List all users you wish to remove from instructors using @tags")
        .setRequired(true)
    ),
  execute,
  usage: "/remove_instructors [members]",
  description: "Remove instructors from the course.*",
  roles: ["admin", facultyRole]
};

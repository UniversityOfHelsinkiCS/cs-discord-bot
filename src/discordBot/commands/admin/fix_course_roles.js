const { SlashCommandBuilder } = require("@discordjs/builders");
const { getAllCourses } = require("../../../db/services/courseService");
const { findUserByDiscordId, findUserByDbId, createUserToDatabase } = require("../../../db/services/userService");
const {
  findCourseMember,
  findAllCourseMembers,
  createCourseMemberToDatabase,
  removeCourseMemberFromDb } = require("../../../db/services/courseMemberService");
const { courseAdminRole } = require("../../../../config.json");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, replyInChunks } = require("../../services/message");

const execute = async (interaction, client, models) => {
  if (!(await requireAdmin(interaction, models))) return;

  await sendEphemeral(interaction, "Fixing course roles...");

  const guild = client.guild;
  await guild.roles.fetch();
  const members = await guild.members.fetch();
  const courses = await getAllCourses(models.Course);

  const fixes = [];

  for (const course of courses) {
    const courseRole = guild.roles.cache.find(r => r.name === course.name);
    if (!courseRole) continue;
    const instructorRole = guild.roles.cache.find(r => r.name === `${course.name} ${courseAdminRole}`);

    const hasInstructorRole = (member) => Boolean(instructorRole) && member.roles.cache.has(instructorRole.id);

    for (const member of members.values()) {
      if (member.user.bot) continue;

      const hasCourseRole = member.roles.cache.has(courseRole.id);
      if (!hasCourseRole && !hasInstructorRole(member)) continue;

      if (!hasCourseRole) {
        await member.roles.add(courseRole);
        fixes.push(`${member.user.username}: added ${course.name} role`);
      }

      let dbUser = await findUserByDiscordId(member.id, models.User);
      if (!dbUser) {
        await createUserToDatabase(member.id, member.user.username, models.User);
        dbUser = await findUserByDiscordId(member.id, models.User);
      }

      let courseMember = await findCourseMember(dbUser.id, course.id, models.CourseMember);
      if (!courseMember) {
        courseMember = await createCourseMemberToDatabase(dbUser.id, course.id, models.CourseMember);
        fixes.push(`${member.user.username}: added to ${course.name} in database`);
      }

      if (courseMember.instructor !== hasInstructorRole(member)) {
        courseMember.instructor = hasInstructorRole(member);
        await courseMember.save();
        fixes.push(`${member.user.username}: set instructor=${courseMember.instructor} on ${course.name}`);
      }
    }

    const courseMembers = await findAllCourseMembers(course.id, models.CourseMember);
    for (const courseMember of courseMembers) {
      const dbUser = await findUserByDbId(courseMember.userId, models.User);
      const member = dbUser && members.get(dbUser.discordId);
      if (!member) continue;

      if (!member.roles.cache.has(courseRole.id) && !hasInstructorRole(member)) {
        await removeCourseMemberFromDb(courseMember.userId, course.id, models.CourseMember);
        fixes.push(`${member.user.username}: removed from ${course.name} in database`);
      }
    }
  }

  const report = fixes.length ? fixes.join("\n") : "No course role mismatches found.";
  await replyInChunks(interaction, report);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fix_course_roles")
    .setDescription("Add missing course roles and sync course memberships from Discord to the database")
    .setDefaultPermission(false),
  execute,
  usage: "/fix_course_roles",
  description: "Add missing course roles and sync course memberships from Discord to the database",
  roles: ["admin"],
};

const { getAllCourses } = require("../../../db/services/courseService");
const { findUserByDiscordId, findUserByDbId, createUserToDatabase } = require("../../../db/services/userService");
const {
  findCourseMember,
  findAllCourseMembers,
  createCourseMemberToDatabase,
  removeCourseMemberFromDb } = require("../../../db/services/courseMemberService");
const { courseAdminRole } = require("../../../../config.json");

const execute = async (message, args, models) => {
  if (!message.member.permissions.has("ADMINISTRATOR")) return;

  const guild = message.client.guild;
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
  for (let i = 0; i < report.length; i += 1000) {
    await message.reply(report.substring(i, i + 1000));
  }
};

module.exports = {
  prefix: true,
  name: "fix_course_roles",
  description: "Add missing course roles and sync course memberships from Discord to the database",
  role: "admin",
  usage: "!fix_course_roles",
  args: false,
  execute,
};

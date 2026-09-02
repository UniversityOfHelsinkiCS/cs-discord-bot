const { updateAnnouncementChannelMessage } = require("../../discordBot/services/service");
const { findCourseFromDbById } = require("../services/courseService");
const { findUserByDbId } = require("../services/userService");
const { courseAdminRole } = require("../../../config.json");
const { joinedUsersCounter } = require("../../promMetrics/promCounters");
const { logInfo, logError } = require("../../discordBot/services/logger");

const initCourseMemberHooks = (guild, models) => {
  models.CourseMember.addHook("afterCreate", async (courseMember) => {
    logInfo("courseMember : " + JSON.stringify(courseMember));
    const user = await findUserByDbId(courseMember.dataValues.userId, models.User);
    logInfo("User: id=" + user.id);
    const course = await findCourseFromDbById(courseMember.dataValues.courseId, models.Course);
    const member = guild.members.cache.get(user.discordId)
      || await guild.members.fetch(user.discordId).catch(() => null);
    logInfo("Member: " + member);
    const courseRole = guild.roles.cache.find(r => r.name === course.name);
    if (!member || !courseRole) {
      return logError(new Error(`afterCreate hook: cannot add course role (course ${course.name}, discordId ${user.discordId}, member found: ${Boolean(member)}, role found: ${Boolean(courseRole)})`));
    }
    await member.roles.add(courseRole);
    joinedUsersCounter.inc({ course: course.name });
  });

  models.CourseMember.addHook("afterBulkDestroy", async (courseMember) => {
    const user = await findUserByDbId(courseMember.where.userId, models.User);
    const course = await findCourseFromDbById(courseMember.where.courseId, models.Course);
    const member = guild.members.cache.get(user.discordId)
      || await guild.members.fetch(user.discordId).catch(() => null);

    if (member) {
      const courseRoles = guild.roles.cache
        .filter(role => (role.name === `${course.name} ${courseAdminRole}` || role.name === course.name))
        .map(role => role.name);

      await Promise.all(member.roles.cache
        .filter(role => courseRoles.includes(role.name))
        .map(async role => await member.roles.remove(role)));
    }
    const announcementChannel = guild.channels.cache.find(c => c.name === `${course.name}_announcement`);
    updateAnnouncementChannelMessage(guild, announcementChannel).catch(logError);
  });

  models.CourseMember.addHook("afterUpdate", async (courseMember) => {
    if (!courseMember._changed.has("instructor")) return;
    const course = await findCourseFromDbById(courseMember.dataValues.courseId, models.Course);
    const announcementChannel = guild.channels.cache.find(c => c.name === `${course.name}_announcement`);
    updateAnnouncementChannelMessage(guild, announcementChannel).catch(logError);
  });
};

module.exports = { initCourseMemberHooks };
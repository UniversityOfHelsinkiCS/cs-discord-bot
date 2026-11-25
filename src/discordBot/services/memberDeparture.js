const { findUserByDiscordId, removeUsersByDbIds, getAllUsers } = require("../../db/services/userService");
const { findInstructedCourseIds } = require("../../db/services/courseMemberService");
const { findCourseFromDbById } = require("../../db/services/courseService");
const { updateAnnouncementChannelMessage } = require("./service");
const { logError } = require("./logger");

const refreshInstructorList = async (guild, courseId, models) => {
  const course = await findCourseFromDbById(courseId, models.Course);
  if (!course) return;
  const announcementChannel = guild.channels.cache.find((c) => c.name === `${course.name}_announcement`);
  await updateAnnouncementChannelMessage(guild, announcementChannel, models);
};

const removeDepartedMember = async (guild, discordId, models) => {
  const user = await findUserByDiscordId(discordId, models.User);
  if (!user) return;
  const instructedCourseIds = await findInstructedCourseIds(user.id, models.CourseMember);
  await removeUsersByDbIds([user.id], models.User);
  await Promise.all(
    instructedCourseIds.map((courseId) => refreshInstructorList(guild, courseId, models).catch(logError))
  );
};

const removeDepartedMembers = async (guild, models) => {
  const users = await getAllUsers(models.User);
  const departedUsers = users.filter((user) => !guild.members.cache.has(user.discordId));
  await Promise.all(departedUsers.map((user) => removeDepartedMember(guild, user.discordId, models)));
};

module.exports = { removeDepartedMember, removeDepartedMembers };

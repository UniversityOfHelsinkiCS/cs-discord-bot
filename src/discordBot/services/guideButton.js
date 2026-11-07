const { MessageFlags } = require("discord.js");
const { GUIDE_BUTTON_PREFIX, JOIN_ACTION, LEAVE_ACTION, parseGuideButtonId } = require("./guide");
const { editEphemeral, editErrorEphemeral } = require("./message");
const { findCourseFromDbById } = require("../../db/services/courseService");
const { createUserToDatabase, findUserByDiscordId } = require("../../db/services/userService");
const {
  findCourseMember,
  createCourseMemberToDatabase,
  removeCourseMemberFromDb
} = require("../../db/services/courseMemberService");

const isGuideButton = (interaction) => interaction.isButton() && interaction.customId.startsWith(GUIDE_BUTTON_PREFIX);

const joinCourse = async (interaction, course, models) => {
  const user = await createUserToDatabase(interaction.user.id, interaction.user.username, models.User);
  const courseMember = await findCourseMember(user.id, course.id, models.CourseMember);
  if (courseMember) {
    return await editEphemeral(interaction, `You are already on **${course.fullName}**.`);
  }
  await createCourseMemberToDatabase(user.id, course.id, models.CourseMember);
  return await editEphemeral(interaction, `You joined **${course.fullName}**.`);
};

const leaveCourse = async (interaction, course, models) => {
  const user = await findUserByDiscordId(interaction.user.id, models.User);
  const courseMember = user && (await findCourseMember(user.id, course.id, models.CourseMember));
  if (!courseMember) {
    return await editEphemeral(interaction, `You are not on **${course.fullName}**.`);
  }
  if (courseMember.instructor) {
    return await editErrorEphemeral(
      interaction,
      `You are an instructor on ${course.fullName}. Ask a faculty member to remove your instructor role with /remove_instructors before you can leave.`
    );
  }
  await removeCourseMemberFromDb(user.id, course.id, models.CourseMember);
  return await editEphemeral(interaction, `You left **${course.fullName}**.`);
};

const ACTIONS = { [JOIN_ACTION]: joinCourse, [LEAVE_ACTION]: leaveCourse };

const handleGuideButton = async (interaction, client, models) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const { action, courseId } = parseGuideButtonId(interaction.customId);
  const handleAction = ACTIONS[action];
  const course = handleAction && courseId && (await findCourseFromDbById(courseId, models.Course));
  if (!course || course.private) {
    return await editErrorEphemeral(interaction, "This course is not available.");
  }

  return await handleAction(interaction, course, models);
};

module.exports = { isGuideButton, handleGuideButton };

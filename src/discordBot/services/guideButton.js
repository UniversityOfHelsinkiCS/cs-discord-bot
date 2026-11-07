const { MessageFlags } = require("discord.js");
const { GUIDE_BUTTON_PREFIX } = require("./guide");
const { editEphemeral, editErrorEphemeral } = require("./message");
const { findCourseFromDbById } = require("../../db/services/courseService");
const { createUserToDatabase } = require("../../db/services/userService");
const {
  findCourseMember,
  createCourseMemberToDatabase,
  removeCourseMemberFromDb
} = require("../../db/services/courseMemberService");

const isGuideButton = (interaction) => interaction.isButton() && interaction.customId.startsWith(GUIDE_BUTTON_PREFIX);

const handleGuideButton = async (interaction, client, models) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const courseId = interaction.customId.slice(GUIDE_BUTTON_PREFIX.length);
  const course = await findCourseFromDbById(courseId, models.Course);
  if (!course || course.private) {
    return await editErrorEphemeral(interaction, "This course is not available.");
  }

  const user = await createUserToDatabase(interaction.user.id, interaction.user.username, models.User);
  const courseMember = await findCourseMember(user.id, course.id, models.CourseMember);

  if (!courseMember) {
    await createCourseMemberToDatabase(user.id, course.id, models.CourseMember);
    return await editEphemeral(interaction, `You joined **${course.fullName}**.`);
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

module.exports = { isGuideButton, handleGuideButton };

const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { courseAdminRole } = require("../../../../config.json");
const { findAndUpdateInstructorRole } = require("../../services/service");
const { findAllCourseNames } = require("../../../db/services/courseService");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  await sendEphemeral(interaction, "Updating instructor roles...");
  if (!(await requireAdmin(interaction, models))) return;

  const guild = client.guild;
  const courseNames = await findAllCourseNames(models.Course);

  for (const courseName of courseNames) {
    await findAndUpdateInstructorRole(courseName, guild, courseAdminRole, courseNames);
  }

  return await editEphemeral(interaction, "Updated instructor roles.");
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("update_instructors")
    .setDescription("Update course instructor roles.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute,
  usage: "/update_instructors",
  description: "Update course instructor roles.",
  roles: ["admin"]
};

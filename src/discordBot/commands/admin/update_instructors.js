const { SlashCommandBuilder } = require("@discordjs/builders");
const { courseAdminRole } = require("../../../../config.json");
const { findAndUpdateInstructorRole } = require("../../services/service");
const { findAllCourseNames } = require("../../../db/services/courseService");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  if (!(await requireAdmin(interaction, models))) return;

  await sendEphemeral(interaction, "Updating instructor roles...");

  const guild = client.guild;
  const courseNames = await findAllCourseNames(models.Course);

  for (const course in courseNames) {
    findAndUpdateInstructorRole(courseNames[course], guild, courseAdminRole);
  }

  return await editEphemeral(interaction, "Updated instructor roles.");
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("update_instructors")
    .setDescription("Update course instructor roles.")
    .setDefaultPermission(false),
  execute,
  usage: "/update_instructors",
  description: "Update course instructor roles.",
  roles: ["admin"],
};

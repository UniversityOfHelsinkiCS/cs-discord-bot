const { SlashCommandBuilder } = require("@discordjs/builders");
const { findAllCourseNames } = require("../../../db/services/courseService");
const { findCategoryWithCourseName } = require("../../services/service");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  if (!(await requireAdmin(interaction, models))) return;

  await sendEphemeral(interaction, "Sorting courses...");

  const guild = client.guild;

  let first = 9999;

  const categoryNames = await findAllCourseNames(models.Course);
  categoryNames.sort((a, b) => a.localeCompare(b));
  const categories = [];
  categoryNames.forEach((cat) => {
    const guildCat = findCategoryWithCourseName(cat, guild);
    if (guildCat) {
      categories.push(guildCat);
      if (first > guildCat.position) first = guildCat.position;
    }
  });
  let category;

  for (let index = 0; index < categories.length; index++) {
    category = categories[index];
    await category.edit({ position: index + first });
  }

  return await editEphemeral(interaction, "Courses sorted alphabetically.");
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sort_courses")
    .setDescription("Sort courses to alphabetical order.")
    .setDefaultPermission(false),
  execute,
  usage: "/sort_courses",
  description: "Sort courses to alphabetical order.",
  roles: ["admin"]
};

const { SlashCommandBuilder } = require("@discordjs/builders");

const { findCoursesFromDb } = require("../../services/service");
const { sendEphemeral } = require("../utils");

const execute = async (interaction, client, Course) => {
  const courses = await findCoursesFromDb("fullName", Course, false);
  const data = courses.map((c) => {
    const fullname = c.fullName.charAt(0).toUpperCase() + c.fullName.slice(1);
    return `${fullname} - \`/join ${c.name}\``;
  });
  if (data.length === 0) sendEphemeral(client, interaction, "No courses available");
  else sendEphemeral(client, interaction, data.join(" \n"));
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("courses")
    .setDescription("Get public course information.")
    .setDefaultPermission(true),
  execute,
  usage: "/courses",
  description: "Get public course information.",
};

const { SlashCommandBuilder } = require("@discordjs/builders");
const { getAllCourses } = require("../../../db/services/courseService");
const { findChannelsByCourse } = require("../../../db/services/channelService");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, replyInChunks } = require("../../services/message");

const execute = async (interaction, client, models) => {
  if (!(await requireAdmin(interaction, models))) return;

  await sendEphemeral(interaction, "Listing bridges...");

  let statusMessage = "";
  const allCourses = await getAllCourses(models.Course);
  for (const course in allCourses) {
    const currentCourse = allCourses[course];

    const courseChannels = await findChannelsByCourse(currentCourse.id, models.Channel);
    const bridged = courseChannels.some((channel) => channel.bridged);

    statusMessage += currentCourse.name + " " + currentCourse.telegramId + " " + bridged + "\n";
  }

  await replyInChunks(interaction, statusMessage || "No courses found.");
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list_bridges")
    .setDescription("List all courses with their telegram bridge id and whether it is in use")
    .setDefaultPermission(false),
  execute,
  usage: "/list_bridges",
  description: "List all courses with their telegram bridge id and whether it is in use",
  roles: ["admin"],
};

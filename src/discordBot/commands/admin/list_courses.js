const { SlashCommandBuilder } = require("@discordjs/builders");
const { getAllCourses } = require("../../../db/services/courseService");
const { findChannelsByCourse } = require("../../../db/services/channelService");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, replyInChunks } = require("../../services/message");

const execute = async (interaction, client, models) => {
  if (!(await requireAdmin(interaction, models))) return;

  await sendEphemeral(interaction, "Listing courses...");

  let statusMessage = "";
  const allCourses = await getAllCourses(models.Course);
  for (const course in allCourses) {
    const currentCourse = allCourses[course];

    statusMessage += "Course: " + currentCourse.name + " " + currentCourse.categoryId + "\n";

    const courseChannels = await findChannelsByCourse(currentCourse.id, models.Channel);

    for (const channel in courseChannels) {
      const currentChannel = courseChannels[channel];
      statusMessage += currentChannel.name + " " + currentChannel.discordId + "\n";
    }
    statusMessage += "\n";
  }

  await replyInChunks(interaction, statusMessage || "No courses found.");
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list_courses")
    .setDescription("List all courses and channels")
    .setDefaultPermission(false),
  execute,
  usage: "/list_courses",
  description: "List all courses and channels",
  roles: ["admin"],
};

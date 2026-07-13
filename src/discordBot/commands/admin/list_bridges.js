const { getAllCourses } = require("../../../db/services/courseService");
const { findChannelsByCourse } = require("../../../db/services/channelService");


const execute = async (message, args, models) => {
  if (message.member.permissions.has("ADMINISTRATOR")) {
    let statusMessage = "";
    const allCourses = await getAllCourses(models.Course);
    for (const course in allCourses) {
      const currentCourse = allCourses[course];

      const courseChannels = await findChannelsByCourse(currentCourse.id, models.Channel);
      const bridged = courseChannels.some((channel) => channel.bridged);

      statusMessage += currentCourse.name + " " + currentCourse.telegramId + " " + bridged + "\n";
    }

    for (let i = 0; i < statusMessage.length;) {
      message.reply(statusMessage.substring(i, i + 1000));
      i += 1000;
    }
  }
};


module.exports = {
  prefix: true,
  name: "list_bridges",
  description: "List all courses with their telegram bridge id and whether it is in use",
  role: "admin",
  usage: "!list_bridges",
  args: false,
  execute,
};


const { findCourseFromDb } = require("../../db/services/courseService");
const { findUserByDiscordId, createUserToDatabase } = require("../../db/services/userService");
const { createCourseMemberToDatabase, removeCourseMemberFromDb, findAllCourseMembersByUser } = require("../../db/services/courseMemberService");

const emoji = "👤";
const GUIDE_CHANNEL_NAME = "guide";

const execute = async (reaction, user, client, models) => {
    console.log("täällä")
    if (user.bot) return;

    const { message } = reaction;
    const channel = message.channel;

    //Make sure it is in the guide channel and the right reaction
    if (channel.name !== GUIDE_CHANNEL_NAME) return;
    if (reaction.emoji.name !== emoji) {
        await reaction.users.remove(user.id); // Still remove the reaction to clean up
        return
    };

    const guild = message.guild;
    const member = await guild.members.fetch(user.id);

    // Extract the course code from the message
    const courseNameMatch = message.content.match(/([A-Za-z0-9]+) -/);
    if (!courseNameMatch) {
        console.error("Couldn't parse course code from message:", message.content);
        return;
    }
    const courseCode = courseNameMatch[1];

    // Find the course from the database
    const course = await findCourseFromDb(courseCode, models.Course);
    if (!course || course.private) {
      console.error(`Course not found or private: ${courseCode}`);
      return;
    }

    // Find or create the user in the database
    let dbUser = await findUserByDiscordId(user.id, models.User);
    if (!dbUser) {
      console.log("added user to db")
      await createUserToDatabase(user.id, user.username, models.User);
      dbUser = await findUserByDiscordId(user.id, models.User);
    }

    // Find what courses the user is already in
    const courseMembers = await findAllCourseMembersByUser(dbUser.id, models.CourseMember);
    const coursesJoinedByUser = courseMembers.map(cm => cm.courseId);

    const isAlreadyInCourse = coursesJoinedByUser.includes(course.id);

    // Always remove their reaction
    console.log("try removing reaction")
    await reaction.users.remove(user.id);
    console.log("attempt done")

    if (isAlreadyInCourse) {
      // User is already in the course -> REMOVE them
      console.log(`Removing user ${user.username} from course ${courseCode} via reaction.`);
      await removeCourseMemberFromDb(dbUser.id, course.id, models.CourseMember);
      console.log(`Removed user.`);

    } else {
      // User is not in the course -> ADD them
      console.log(`Adding user ${user.username} to course ${courseCode} via reaction.`);
      await createCourseMemberToDatabase(dbUser.id, course.id, models.CourseMember);
      console.log(`Added user.`);
    }
}



module.exports = {
    name: "messageReactionAdd",
    execute,
};

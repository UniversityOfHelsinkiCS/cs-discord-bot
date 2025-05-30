const { findCoursesFromDb, findAllCourseNames, findCourseFromDb } = require("../../db/services/courseService");
const { findCourseMemberCount } = require("../../db/services/courseMemberService");

require("dotenv").config();
const GUIDE_CHANNEL_NAME = "guide";

let invite_url = "";

process.env.NODE_ENV === "production" ? invite_url = `${process.env.BACKEND_SERVER_URL}` : invite_url = `${process.env.BACKEND_SERVER_URL}:${process.env.PORT}`;


const updateGuide = async (guild, models) => {
  const channel = guild.channels.cache.find(
    (c) => c.name === GUIDE_CHANNEL_NAME,
  );

  if (!channel) {
    console.error("Guide channel not found!");
    return;
  }

  const messages = await channel.messages.fetch({ limit: 100 });
  const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  const infoMessage = sortedMessages.first();

  if (!infoMessage) {
    console.error("No info message found! Delete the guide channel and launch the bot again to init the message.");
    return;
  }

  await updateGuideMessage(infoMessage, sortedMessages, channel, models);
};

const updateGuideMessage = async (infoMessage, sortedMessages, channel, models) => {
  const courseData = await findCoursesFromDb("code", models.Course, false);

  // Collect all course member counts in parallel - faster fetching
  const courseMemberCounts = await Promise.all(courseData.map(course =>
    findCourseMemberCount(course.id, models.CourseMember)
  ));

  // Now build rows without additional awaits
  const rows = courseData.map((course, index) => {
    const regExp = /[^0-9]*/;
    const fullname = course.fullName;
    const name = course.name;
    const matches = regExp.exec(course.code)?.[0];
    const code = matches ? matches + course.code.slice(matches.length) : course.code;
    const count = courseMemberCounts[index];
    return `${name} - ${code} - ${fullname} 👥${count}`;
  });

  const infoContent = `
Käytössäsi on seuraavia komentoja:
  - \`/join\` jolla voit liittyä kurssille
  - \`/leave\` jolla voit poistua kurssilta
Kirjoittamalla \`/join\` tai \`/leave\` botti antaa listan kursseista.

You have the following commands available:
  - \`/join\` which you can use to join a course
  - \`/leave\` which you can use to leave a course
The bot gives a list of the courses if you type \`/join\` or \`/leave\`.

In course specific channels you can also list instructors with the command \`/instructors\`

See more with \`/help\` command.

Invitation link for the server ${invite_url}
`.trim(); // <-- .trim() here to remove leading/trailing whitespace

  const messagesArray = Array.from(sortedMessages.values());

  const courseMessages = messagesArray.filter(m => m.id !== infoMessage.id && m.type !== 'CHANNEL_PINNED_MESSAGE');

  // Edit the info message first
  await infoMessage.edit(infoContent);

  // Prepare promises for editing/sending messages instead of awaiting one-by-one
  const editOrSendPromises = [];

  for (let i = 0; i < rows.length; i++) {
    const rowContent = rows[i];
    const courseMessage = courseMessages[i];

    if (courseMessage) {
      editOrSendPromises.push(courseMessage.edit(rowContent));
    } else {
      // If no courseMessage exists, send a new message and react to it
      editOrSendPromises.push(
        channel.send(rowContent).then(msg => msg.react("👤"))
      );
    }
  }

  await Promise.all(editOrSendPromises); // Await all at once

  // Delete any extra old course messages
  if (courseMessages.length > rows.length) {
    const deletePromises = courseMessages.slice(rows.length).map(msg => msg.delete());
    await Promise.all(deletePromises);
  }
};

module.exports = {
  updateGuide,
  updateGuideMessage,
};
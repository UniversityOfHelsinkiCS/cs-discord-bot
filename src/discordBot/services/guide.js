const { findCoursesFromDb } = require("../../db/services/courseService");
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

  // Collecting all course member counts in parallel
  const courseMemberCounts = await Promise.all(courseData.map(course =>
    findCourseMemberCount(course.id, models.CourseMember),
  ));

  const rows = courseData.map((course, index) => {
    const regExp = /[^0-9]*/;
    const fullname = course.fullName;
    const name = course.name;
    const matches = regExp.exec(course.code)?.[0];
    const code = matches ? matches + course.code.slice(matches.length) : course.code;
    const count = courseMemberCounts[index];
    return `${name} - ${code} - ${fullname} 👥${count}`;
  });

  const infoContent = `.
**Suomeksi**
 Alla on lista kursseja, joiden keskustelukanaville voi liittyä tai poistua painamalla kurssin reaktionappulaa [👤 1].
Kurssikohtaisilla kanavilla voit käyttää komentoa \`/instructors\` nähdäksesi kurssin ohjaajat.
Lisää komennolla \`/help\`.

**På svensk**
Nedan är en lista över kurser som du kan delta i eller lämna genom att klicka på reaktionsknappen för kurser [👤 1].
I kursspecifika kanaler kan du lista instruktörer med kommandot \`/instructors\`.
Se mer med kommandot \`/help\`.

**In english**
Below is a list of course that you can join or leave by clicking the course reaction button [👤 1].
In course specific channels you can list instructors with the command \`/instructors\`
See more with \`/help\` command.

Invitation link for the server ${invite_url}
`;

  const messagesArray = Array.from(sortedMessages.values());

  const courseMessages = messagesArray.filter(m => m.id !== infoMessage.id && m.type !== "CHANNEL_PINNED_MESSAGE");

  // Editing the info message
  await infoMessage.edit(infoContent);

  // Editing course messages
  const editOrSendPromises = [];
  for (let i = 0; i < rows.length; i++) {
    const rowContent = rows[i];
    const courseMessage = courseMessages[i];

    if (courseMessage) {
      if (courseMessage.content !== rowContent) {
        editOrSendPromises.push(courseMessage.edit(rowContent));
      }
    }
    else {
      // If not enough courseMessages exist, send a new message and react to it
      editOrSendPromises.push(
        channel.send(rowContent).then(msg => msg.react("👤")),
      );
    }
  }

  // Promise all at once
  await Promise.all(editOrSendPromises);

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
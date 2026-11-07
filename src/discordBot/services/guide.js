const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageType } = require("discord.js");
const { findCoursesFromDb } = require("../../db/services/courseService");
const { findCourseMemberCount } = require("../../db/services/courseMemberService");
const { logError } = require("./logger");

require("dotenv").config({ quiet: true });
const GUIDE_CHANNEL_NAME = "guide";
const GUIDE_BUTTON_PREFIX = "guide:";
const GUIDE_BUTTON_LABEL = "Join / Leave";

const buildGuideButtonRow = (customId) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customId).setLabel(GUIDE_BUTTON_LABEL).setStyle(ButtonStyle.Primary)
  );

const getGuideButtonId = (message) => message.components?.[0]?.components?.[0]?.customId;

const removeReactions = async (message) => {
  if (!message.reactions?.cache.size) return;
  await message.reactions.removeAll().catch(logError);
};

const invite_url =
  process.env.NODE_ENV === "production"
    ? `${process.env.BACKEND_SERVER_URL}`
    : `${process.env.BACKEND_SERVER_URL}:${process.env.PORT}`;

const updateGuide = async (guild, models) => {
  const channel = guild.channels.cache.find((c) => c.name === GUIDE_CHANNEL_NAME);

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
  const courseData = await findCoursesFromDb("fullName", models.Course, false);

  // Collecting all course member counts in parallel
  const courseMemberCounts = await Promise.all(
    courseData.map((course) => findCourseMemberCount(course.id, models.CourseMember))
  );

  const rows = courseData.map((course, index) => ({
    content: `### ${course.fullName}\n${course.name} · ${course.code} · 👥 ${courseMemberCounts[index]}`,
    customId: `${GUIDE_BUTTON_PREFIX}${course.id}`
  }));

  const infoContent = `.
**Suomeksi**
 Alla on lista kursseja, joiden keskustelukanaville voi liittyä tai poistua painamalla kurssin **${GUIDE_BUTTON_LABEL}** -painiketta.
Voit myös liittyä kursseille ja poistua niiltä komennoilla \`/join\` ja \`/leave\`.
Kurssikohtaisilla kanavilla voit käyttää komentoa \`/instructors\` nähdäksesi kurssin ohjaajat.
Lisää komennolla \`/help\`.

**På svensk**
Nedan är en lista över kurser som du kan delta i eller lämna genom att klicka på kursens **${GUIDE_BUTTON_LABEL}**-knapp.
Du kan också gå med i och lämna kurser med kommandona \`/join\` och \`/leave\`.
I kursspecifika kanaler kan du lista instruktörer med kommandot \`/instructors\`.
Se mer med kommandot \`/help\`.

**In english**
Below is a list of courses that you can join or leave by clicking the course's **${GUIDE_BUTTON_LABEL}** button.
You can also join and leave courses with the \`/join\` and \`/leave\` commands.
In course specific channels you can list instructors with the command \`/instructors\`
See more with \`/help\` command.

Invitation link for the server ${invite_url}
`;

  const messagesArray = Array.from(sortedMessages.values());

  const courseMessages = messagesArray.filter(
    (m) => m.id !== infoMessage.id && m.type !== MessageType.ChannelPinnedMessage
  );

  // Editing the info message
  await infoMessage.edit(infoContent);
  await removeReactions(infoMessage);

  // Editing course messages
  const editOrSendPromises = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const courseMessage = courseMessages[i];
    const messageData = { content: row.content, components: [buildGuideButtonRow(row.customId)] };

    if (courseMessage) {
      if (courseMessage.content !== row.content || getGuideButtonId(courseMessage) !== row.customId) {
        editOrSendPromises.push(courseMessage.edit(messageData));
      }
      editOrSendPromises.push(removeReactions(courseMessage));
    } else {
      editOrSendPromises.push(channel.send(messageData));
    }
  }

  // Promise all at once
  await Promise.all(editOrSendPromises);

  // Delete any extra old course messages
  if (courseMessages.length > rows.length) {
    const deletePromises = courseMessages.slice(rows.length).map((msg) => msg.delete());
    await Promise.all(deletePromises);
  }
};

module.exports = {
  updateGuide,
  updateGuideMessage,
  GUIDE_BUTTON_PREFIX
};

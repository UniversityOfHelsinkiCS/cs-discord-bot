const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  MessageType,
  TextDisplayBuilder
} = require("discord.js");
const { findCoursesFromDb } = require("../../db/services/courseService");
const { findCourseMemberCount } = require("../../db/services/courseMemberService");
const { logError } = require("./logger");
const { backendUrl } = require("./backendUrl");

require("dotenv").config({ quiet: true });
const GUIDE_CHANNEL_NAME = "guide";
const GUIDE_BUTTON_PREFIX = "guide:";
const JOIN_ACTION = "join";
const LEAVE_ACTION = "leave";
const GUIDE_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

const buildGuideButtonId = (action, courseId) => `${GUIDE_BUTTON_PREFIX}${action}:${courseId}`;

const parseGuideButtonId = (customId) => {
  const [action, courseId] = customId.slice(GUIDE_BUTTON_PREFIX.length).split(":");
  return { action, courseId };
};

const buildCourseBlocks = (course, memberCount) => [
  { text: `### ${course.fullName}` },
  {
    buttons: [
      { customId: buildGuideButtonId(JOIN_ACTION, course.id), label: "Join", style: ButtonStyle.Primary },
      { customId: buildGuideButtonId(LEAVE_ACTION, course.id), label: "Leave", style: ButtonStyle.Danger }
    ]
  },
  { text: `${course.name} · ${course.code} · 👥 ${memberCount}` }
];

const buildComponent = (block) =>
  block.text
    ? new TextDisplayBuilder().setContent(block.text)
    : new ActionRowBuilder().addComponents(
        block.buttons.map((button) =>
          new ButtonBuilder().setCustomId(button.customId).setLabel(button.label).setStyle(button.style)
        )
      );

const toMessageData = (blocks) => ({
  content: "",
  flags: MessageFlags.IsComponentsV2,
  components: blocks.map(buildComponent)
});

const blockSignature = (blocks) =>
  blocks
    .map((block) => block.text ?? block.buttons.map((button) => `${button.label}:${button.customId}`).join(","))
    .join("\n");

const componentSignature = (component) => {
  if (component.type === ComponentType.TextDisplay) return component.content;
  if (component.type === ComponentType.ActionRow) {
    return component.components.map((button) => `${button.label}:${button.customId}`).join(",");
  }
  return "";
};

const messageSignature = (message) => (message.components ?? []).map(componentSignature).join("\n");

const removeReactions = async (message) => {
  if (!message.reactions?.cache.size) return;
  await message.reactions.removeAll().catch(logError);
};

const LIST_BELOW = { fi: "Alla", sv: "Nedan", en: "Below" };
const LIST_ABOVE = { fi: "Yllä", sv: "Ovan", en: "Above" };

const buildInfoContent = (listPosition) => `### Suomeksi
${listPosition.fi} on lista kursseja, joiden keskustelukanaville voi liittyä tai poistua painamalla kurssin **Join**- tai **Leave**-painiketta.
Voit myös liittyä kursseille ja poistua niiltä komennoilla \`/join\` ja \`/leave\`.
Kurssikohtaisilla kanavilla voit käyttää komentoa \`/instructors\` nähdäksesi kurssin ohjaajat.
Lisää komennolla \`/help\`.

### På svenska
${listPosition.sv} är en lista över kurser som du kan delta i eller lämna genom att klicka på kursens **Join**- eller **Leave**-knapp.
Du kan också gå med i och lämna kurser med kommandona \`/join\` och \`/leave\`.
I kursspecifika kanaler kan du lista instruktörer med kommandot \`/instructors\`.
Se mer med kommandot \`/help\`.

### In english
${listPosition.en} is a list of courses that you can join or leave by clicking the course's **Join** or **Leave** button.
You can also join and leave courses with the \`/join\` and \`/leave\` commands.
In course specific channels you can list instructors with the command \`/instructors\`
See more with \`/help\` command.

Invitation link for the server ${backendUrl}`;

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

  const courseMemberCounts = await Promise.all(
    courseData.map((course) => findCourseMemberCount(course.id, models.CourseMember))
  );

  const rows = [
    ...courseData.map((course, index) => buildCourseBlocks(course, courseMemberCounts[index])),
    [{ text: buildInfoContent(LIST_ABOVE) }]
  ];

  const listMessages = Array.from(sortedMessages.values()).filter(
    (m) => m.id !== infoMessage.id && m.type !== MessageType.ChannelPinnedMessage
  );

  const infoContent = buildInfoContent(LIST_BELOW);
  if (infoMessage.content !== infoContent) {
    await infoMessage.edit(infoContent);
  }
  await removeReactions(infoMessage);

  await Promise.all(
    rows.slice(0, listMessages.length).map(async (blocks, i) => {
      const message = listMessages[i];
      if (messageSignature(message) !== blockSignature(blocks)) {
        await message.edit(toMessageData(blocks));
      }
      await removeReactions(message);
    })
  );

  for (const blocks of rows.slice(listMessages.length)) {
    await channel.send(toMessageData(blocks));
  }

  await Promise.all(listMessages.slice(rows.length).map((message) => message.delete()));
};

const startGuideRefresh = (guild, models) =>
  setInterval(() => updateGuide(guild, models).catch(logError), GUIDE_REFRESH_INTERVAL_MS);

module.exports = {
  updateGuide,
  startGuideRefresh,
  updateGuideMessage,
  GUIDE_BUTTON_PREFIX,
  JOIN_ACTION,
  LEAVE_ACTION,
  parseGuideButtonId
};

const { ButtonStyle, Collection, ComponentType, MessageFlags, MessageType } = require("discord.js");
const { updateGuideMessage, startGuideRefresh } = require("../../src/discordBot/services/guide");

jest.mock("../../src/db/services/courseService", () => ({
  findCoursesFromDb: jest.fn()
}));
jest.mock("../../src/db/services/courseMemberService", () => ({
  findCourseMemberCount: jest.fn()
}));

const { findCoursesFromDb } = require("../../src/db/services/courseService");
const { findCourseMemberCount } = require("../../src/db/services/courseMemberService");

const createMockMessage = (id, content = "old content") => ({
  id,
  type: "DEFAULT",
  content,
  edit: jest.fn(),
  delete: jest.fn()
});

const setupMocks = (courseCount = 2, extraMessages = 1) => {
  const courses = Array.from({ length: courseCount }, (_, i) => ({
    id: i + 1,
    code: `TKT10${i + 1}`,
    fullName: `Course ${i + 1}`,
    name: `tkt10${i + 1}`
  }));
  findCoursesFromDb.mockResolvedValue(courses);
  for (let i = 0; i < courseCount; i++) {
    findCourseMemberCount.mockResolvedValueOnce((i + 1) * 5);
  }

  const infoMessage = { id: "info", edit: jest.fn() };
  let courseMessages = Array.from({ length: courseCount }, (_, i) => createMockMessage(`msg${i + 1}`));
  let extras = [];

  if (extraMessages >= 0) {
    extras = Array.from({ length: extraMessages }, (_, i) => createMockMessage(`extra${i + 1}`, "extra"));
  } else {
    const removeCount = Math.abs(extraMessages);
    if (removeCount > courseMessages.length) {
      throw new Error("extraMessages is too negative, cannot remove more course messages than exist.");
    }
    courseMessages = courseMessages.slice(0, courseMessages.length - removeCount);
  }

  const sortedMessages = new Map([
    ["info", infoMessage],
    ...courseMessages.map((m) => [m.id, m]),
    ...extras.map((m) => [m.id, m])
  ]);

  const channel = {
    send: jest.fn(() => Promise.resolve({}))
  };

  return { infoMessage, courseMessages, extras, sortedMessages, channel, courses };
};

const toJSON = (messageData) => messageData.components.map((component) => component.toJSON());

describe("updateGuideMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("lists public courses ordered by full name", async () => {
    const { infoMessage, sortedMessages, channel } = setupMocks(2, 0);
    const models = { Course: {}, CourseMember: {} };

    await updateGuideMessage(infoMessage, sortedMessages, channel, models);

    expect(findCoursesFromDb).toHaveBeenCalledWith("fullName", models.Course, false);
  });

  test("course messages show the heading, a blue join and red leave button, then the details", async () => {
    const { infoMessage, courseMessages, sortedMessages, channel } = setupMocks(1, 0);

    await updateGuideMessage(infoMessage, sortedMessages, channel, { Course: {}, CourseMember: {} });

    const messageData = courseMessages[0].edit.mock.calls[0][0];
    expect(messageData.content).toBe("");
    expect(messageData.flags).toBe(MessageFlags.IsComponentsV2);
    const [heading, buttonRow, details] = toJSON(messageData);
    expect(heading).toMatchObject({ type: ComponentType.TextDisplay, content: "### Course 1" });
    expect(buttonRow.components).toMatchObject([
      { custom_id: "guide:join:1", label: "Join", style: ButtonStyle.Primary },
      { custom_id: "guide:leave:1", label: "Leave", style: ButtonStyle.Danger }
    ]);
    expect(details).toMatchObject({ type: ComponentType.TextDisplay, content: "tkt101 · TKT101 · 👥 5" });
  });

  test("an up-to-date course message is not edited again", async () => {
    const { infoMessage, courseMessages, sortedMessages, channel } = setupMocks(1, 0);
    courseMessages[0].components = [
      { type: ComponentType.TextDisplay, content: "### Course 1" },
      {
        type: ComponentType.ActionRow,
        components: [
          { label: "Join", customId: "guide:join:1" },
          { label: "Leave", customId: "guide:leave:1" }
        ]
      },
      { type: ComponentType.TextDisplay, content: "tkt101 · TKT101 · 👥 5" }
    ];

    await updateGuideMessage(infoMessage, sortedMessages, channel, { Course: {}, CourseMember: {} });

    expect(courseMessages[0].edit).not.toHaveBeenCalled();
  });

  test("old reactions are removed from the info message", async () => {
    const { infoMessage, sortedMessages, channel } = setupMocks(1, 0);
    const removeAll = jest.fn(() => Promise.resolve());
    infoMessage.reactions = { cache: { size: 1 }, removeAll };

    await updateGuideMessage(infoMessage, sortedMessages, channel, { Course: {}, CourseMember: {} });

    expect(removeAll).toHaveBeenCalledTimes(1);
  });

  test("the pinned message notice is not treated as a course message", async () => {
    const { infoMessage, courseMessages, sortedMessages, channel } = setupMocks(1, 0);
    const pinNotice = { ...createMockMessage("pin"), type: MessageType.ChannelPinnedMessage };
    const withPinNotice = new Map([["info", infoMessage], ["pin", pinNotice], ...sortedMessages]);

    await updateGuideMessage(infoMessage, withPinNotice, channel, { Course: {}, CourseMember: {} });

    expect(pinNotice.edit).not.toHaveBeenCalled();
    expect(pinNotice.delete).not.toHaveBeenCalled();
    expect(courseMessages[0].edit).toHaveBeenCalledTimes(1);
  });

  test("old reactions are removed from course messages", async () => {
    const { infoMessage, courseMessages, sortedMessages, channel } = setupMocks(1, 0);
    const removeAll = jest.fn(() => Promise.resolve());
    courseMessages[0].reactions = { cache: { size: 1 }, removeAll };

    await updateGuideMessage(infoMessage, sortedMessages, channel, { Course: {}, CourseMember: {} });

    expect(removeAll).toHaveBeenCalledTimes(1);
  });

  test("edits info message, edits existing course messages, deletes extras", async () => {
    const { infoMessage, courseMessages, extras, sortedMessages, channel } = setupMocks(5, 2);

    await updateGuideMessage(infoMessage, sortedMessages, channel, { Course: {}, CourseMember: {} });

    expect(infoMessage.edit).toHaveBeenCalledTimes(1);
    courseMessages.forEach((msg) => expect(msg.edit).toHaveBeenCalledTimes(1));
    expect(extras[0].edit).toHaveBeenCalledTimes(1);
    expect(channel.send).not.toHaveBeenCalled();
    expect(extras[1].delete).toHaveBeenCalledTimes(1);
  });

  test("sends new course messages and the bottom info message in order when there are too few messages", async () => {
    const { infoMessage, courseMessages, sortedMessages, channel } = setupMocks(5, -1);

    await updateGuideMessage(infoMessage, sortedMessages, channel, { Course: {}, CourseMember: {} });

    expect(infoMessage.edit).toHaveBeenCalledTimes(1);
    expect(courseMessages[0].edit).toHaveBeenCalledTimes(1);
    expect(channel.send).toHaveBeenCalledTimes(2);
    expect(channel.send.mock.calls[0][0].components).toHaveLength(3);
    expect(channel.send.mock.calls[1][0].components).toHaveLength(1);
    expect(channel.send.mock.calls[1][0].flags).toBe(MessageFlags.IsComponentsV2);
  });

  test("the top info message points below and the bottom one points above, without a leading dot", async () => {
    const { infoMessage, sortedMessages, channel } = setupMocks(1, 0);

    await updateGuideMessage(infoMessage, sortedMessages, channel, { Course: {}, CourseMember: {} });

    const topContent = infoMessage.edit.mock.calls[0][0];
    const [bottomText] = toJSON(channel.send.mock.calls[0][0]);
    expect(topContent.startsWith("### Suomeksi\nAlla on lista")).toBe(true);
    expect(topContent).toContain("Nedan är en lista");
    expect(topContent).toContain("Below is a list");
    expect(topContent).toContain("**Join** or **Leave** button");
    expect(bottomText.content.startsWith("### Suomeksi\nYllä on lista")).toBe(true);
    expect(bottomText.content).toContain("Ovan är en lista");
    expect(bottomText.content).toContain("Above is a list");
  });

  test("a former course message becomes the bottom info message when the course list shrinks", async () => {
    const { infoMessage, courseMessages, sortedMessages, channel } = setupMocks(1, 1);
    const lastMessage = [...sortedMessages.values()].at(-1);

    await updateGuideMessage(infoMessage, sortedMessages, channel, { Course: {}, CourseMember: {} });

    expect(courseMessages[0].edit).toHaveBeenCalledTimes(1);
    const [infoText] = toJSON(lastMessage.edit.mock.calls[0][0]);
    expect(infoText.type).toBe(ComponentType.TextDisplay);
    expect(infoText.content.startsWith("### Suomeksi\nYllä on lista")).toBe(true);
    expect(lastMessage.delete).not.toHaveBeenCalled();
  });

  test("an up-to-date top info message is not edited again", async () => {
    const { infoMessage, sortedMessages, channel } = setupMocks(1, 0);
    await updateGuideMessage(infoMessage, sortedMessages, channel, { Course: {}, CourseMember: {} });
    infoMessage.content = infoMessage.edit.mock.calls[0][0];
    infoMessage.edit.mockClear();
    setupMocks(1, 0);

    await updateGuideMessage(infoMessage, sortedMessages, channel, { Course: {}, CourseMember: {} });

    expect(infoMessage.edit).not.toHaveBeenCalled();
  });
});

describe("startGuideRefresh", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    console.error.mockRestore();
  });

  test("refreshes the guide once an hour", async () => {
    const fetch = jest.fn(() => Promise.resolve(new Collection()));
    const guild = { channels: { cache: { find: () => ({ messages: { fetch } }) } } };

    startGuideRefresh(guild, { Course: {}, CourseMember: {} });

    await jest.advanceTimersByTimeAsync(59 * 60 * 1000);
    expect(fetch).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(60 * 1000);
    expect(fetch).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

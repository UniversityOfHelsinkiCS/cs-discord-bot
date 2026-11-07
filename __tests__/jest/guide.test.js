const { updateGuideMessage } = require("../../src/discordBot/services/guide");

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
    send: jest.fn(() =>
      Promise.resolve({
        react: jest.fn(() => Promise.resolve())
      })
    )
  };

  return { infoMessage, courseMessages, extras, sortedMessages, channel, courses };
};

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

  test("course messages show the full name as a heading, details below and a join/leave button", async () => {
    const { infoMessage, courseMessages, sortedMessages, channel } = setupMocks(1, 0);

    await updateGuideMessage(infoMessage, sortedMessages, channel, { Course: {}, CourseMember: {} });

    const { content, components } = courseMessages[0].edit.mock.calls[0][0];
    expect(content).toBe("### Course 1\ntkt101 · TKT101 · 👥 5");
    const button = components[0].toJSON().components[0];
    expect(button.custom_id).toBe("guide:1");
    expect(button.label).toBe("Join / Leave");
  });

  test("an up-to-date course message is not edited again", async () => {
    const { infoMessage, courseMessages, sortedMessages, channel } = setupMocks(1, 0);
    courseMessages[0].content = "### Course 1\ntkt101 · TKT101 · 👥 5";
    courseMessages[0].components = [{ components: [{ customId: "guide:1" }] }];

    await updateGuideMessage(infoMessage, sortedMessages, channel, { Course: {}, CourseMember: {} });

    expect(courseMessages[0].edit).not.toHaveBeenCalled();
  });

  test("old reactions are removed from course messages", async () => {
    const { infoMessage, courseMessages, sortedMessages, channel } = setupMocks(1, 0);
    const removeAll = jest.fn(() => Promise.resolve());
    courseMessages[0].reactions = { cache: { size: 1 }, removeAll };

    await updateGuideMessage(infoMessage, sortedMessages, channel, { Course: {}, CourseMember: {} });

    expect(removeAll).toHaveBeenCalledTimes(1);
  });

  test("edits info message, edits existing course messages, deletes extras", async () => {
    const { infoMessage, courseMessages, extras, sortedMessages, channel } = setupMocks(5, 1);

    await updateGuideMessage(infoMessage, sortedMessages, channel, { Course: {}, CourseMember: {} });

    expect(infoMessage.edit).toHaveBeenCalledTimes(1);
    courseMessages.forEach((msg) => expect(msg.edit).toHaveBeenCalledTimes(1));
    expect(channel.send).not.toHaveBeenCalled();
    extras.forEach((msg) => expect(msg.delete).toHaveBeenCalledTimes(1));
  });

  test("sends new course messages when there are too few messages", async () => {
    const { infoMessage, courseMessages, sortedMessages, channel } = setupMocks(5, -1);

    await updateGuideMessage(infoMessage, sortedMessages, channel, { Course: {}, CourseMember: {} });

    expect(infoMessage.edit).toHaveBeenCalledTimes(1);
    expect(courseMessages[0].edit).toHaveBeenCalledTimes(1);
    expect(channel.send).toHaveBeenCalledTimes(1);
  });
});

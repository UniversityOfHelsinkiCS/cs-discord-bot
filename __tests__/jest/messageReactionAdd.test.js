const { execute } = require("../../src/discordBot/events/messageReactionAdd");
const { findCourseFromDb } = require("../../src/db/services/courseService");
const { findUserByDiscordId } = require("../../src/db/services/userService");
const {
  createCourseMemberToDatabase,
  removeCourseMemberFromDb,
  findAllCourseMembersByUser
} = require("../../src/db/services/courseMemberService");
const { sendErrorReportNoInteraction } = require("../../src/discordBot/services/message");

jest.mock("../../src/db/services/courseService");
jest.mock("../../src/db/services/userService");
jest.mock("../../src/db/services/courseMemberService");
jest.mock("../../src/discordBot/services/message");

const models = { Course: {}, User: {}, CourseMember: {} };
const client = { guild: {} };
// discord.js v14 emits messageReactionAdd(reaction, user, details)
const details = { type: 0, burst: false };
const user = { id: "u1", username: "alice", bot: false };

const buildReaction = ({ channelName = "guide", emoji = "👤", content = "test - Test course - test" } = {}) => ({
  message: { channel: { name: channelName }, content, reactions: { cache: new Map() } },
  emoji: { name: emoji },
  remove: jest.fn()
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  findCourseFromDb.mockImplementation(() => ({ id: 1, private: false }));
  findUserByDiscordId.mockImplementation(() => ({ id: 10 }));
  findAllCourseMembersByUser.mockImplementation(() => []);
});

describe("messageReactionAdd", () => {
  test("uses the models argument that follows the v14 details argument", async () => {
    await execute(buildReaction(), user, details, client, models);
    expect(findCourseFromDb).toHaveBeenCalledWith("test", models.Course);
    expect(findUserByDiscordId).toHaveBeenCalledWith("u1", models.User);
    expect(createCourseMemberToDatabase).toHaveBeenCalledWith(10, 1, models.CourseMember);
  });

  test("removes the user from a course they are already in", async () => {
    findAllCourseMembersByUser.mockImplementation(() => [{ courseId: 1, instructor: false }]);
    await execute(buildReaction(), user, details, client, models);
    expect(removeCourseMemberFromDb).toHaveBeenCalledWith(10, 1, models.CourseMember);
    expect(createCourseMemberToDatabase).not.toHaveBeenCalled();
  });

  test("never removes an instructor from their course", async () => {
    findAllCourseMembersByUser.mockImplementation(() => [{ courseId: 1, instructor: true }]);
    await execute(buildReaction(), user, details, client, models);
    expect(removeCourseMemberFromDb).not.toHaveBeenCalled();
    expect(createCourseMemberToDatabase).not.toHaveBeenCalled();
  });

  test("ignores bots", async () => {
    await execute(buildReaction(), { ...user, bot: true }, details, client, models);
    expect(findCourseFromDb).not.toHaveBeenCalled();
  });

  test("ignores reactions outside the guide channel", async () => {
    await execute(buildReaction({ channelName: "general" }), user, details, client, models);
    expect(findCourseFromDb).not.toHaveBeenCalled();
  });

  test("removes reactions that use the wrong emoji", async () => {
    const reaction = buildReaction({ emoji: "😀" });
    await execute(reaction, user, details, client, models);
    expect(reaction.remove).toHaveBeenCalledTimes(1);
    expect(findCourseFromDb).not.toHaveBeenCalled();
  });

  test("ignores private courses", async () => {
    findCourseFromDb.mockImplementation(() => ({ id: 1, private: true }));
    await execute(buildReaction(), user, details, client, models);
    expect(createCourseMemberToDatabase).not.toHaveBeenCalled();
  });

  test("reports errors using the real client, not the event details", async () => {
    findCourseFromDb.mockImplementation(() => {
      throw new Error("boom");
    });
    await execute(buildReaction(), user, details, client, models);
    expect(sendErrorReportNoInteraction).toHaveBeenCalledWith(0, user, "guide", client, "Error: boom");
  });
});

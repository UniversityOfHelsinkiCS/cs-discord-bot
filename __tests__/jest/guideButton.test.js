const { isGuideButton, handleGuideButton } = require("../../src/discordBot/services/guideButton");
const { editEphemeral, editErrorEphemeral } = require("../../src/discordBot/services/message");
const { findCourseFromDbById } = require("../../src/db/services/courseService");
const { createUserToDatabase, findUserByDiscordId, removeUserIfUnused } = require("../../src/db/services/userService");
const {
  findCourseMember,
  createCourseMemberToDatabase,
  removeCourseMemberFromDb
} = require("../../src/db/services/courseMemberService");

jest.mock("../../src/discordBot/services/message");
jest.mock("../../src/db/services/courseService");
jest.mock("../../src/db/services/userService");
jest.mock("../../src/db/services/courseMemberService");

const models = { Course: {}, User: {}, CourseMember: {} };
const course = { id: 7, fullName: "Ohjelmistotuotanto", private: false };
const user = { id: 3 };

const makeInteraction = (customId) => ({
  customId,
  user: { id: "100", username: "student" },
  isButton: () => true,
  deferReply: jest.fn()
});

beforeEach(() => {
  jest.clearAllMocks();
  findCourseFromDbById.mockImplementation(() => course);
  createUserToDatabase.mockImplementation(() => user);
  findUserByDiscordId.mockImplementation(() => user);
  findCourseMember.mockImplementation(() => null);
});

describe("isGuideButton", () => {
  test("matches only buttons with the guide prefix", () => {
    expect(isGuideButton(makeInteraction("guide:join:7"))).toBe(true);
    expect(isGuideButton(makeInteraction("x"))).toBe(false);
    expect(isGuideButton({ isButton: () => false, customId: "guide:join:7" })).toBe(false);
  });
});

describe("join button", () => {
  test("joins the course when the user is not a member", async () => {
    const interaction = makeInteraction("guide:join:7");
    await handleGuideButton(interaction, {}, models);
    expect(interaction.deferReply).toHaveBeenCalledTimes(1);
    expect(findCourseFromDbById).toHaveBeenCalledWith("7", models.Course);
    expect(createUserToDatabase).toHaveBeenCalledWith("100", "student", models.User);
    expect(createCourseMemberToDatabase).toHaveBeenCalledWith(user.id, course.id, models.CourseMember);
    expect(editEphemeral).toHaveBeenCalledWith(interaction, "You joined **Ohjelmistotuotanto**.");
  });

  test("does nothing when the user is already a member", async () => {
    findCourseMember.mockImplementation(() => ({ instructor: false }));
    const interaction = makeInteraction("guide:join:7");
    await handleGuideButton(interaction, {}, models);
    expect(createCourseMemberToDatabase).not.toHaveBeenCalled();
    expect(removeCourseMemberFromDb).not.toHaveBeenCalled();
    expect(editEphemeral).toHaveBeenCalledWith(interaction, "You are already on **Ohjelmistotuotanto**.");
  });
});

describe("leave button", () => {
  test("leaves the course when the user is a member", async () => {
    findCourseMember.mockImplementation(() => ({ instructor: false }));
    const interaction = makeInteraction("guide:leave:7");
    await handleGuideButton(interaction, {}, models);
    expect(removeCourseMemberFromDb).toHaveBeenCalledWith(user.id, course.id, models.CourseMember);
    expect(removeUserIfUnused).toHaveBeenCalledWith(user.id, models.User, models.CourseMember);
    expect(editEphemeral).toHaveBeenCalledWith(interaction, "You left **Ohjelmistotuotanto**.");
  });

  test("does not create a record for a user without one", async () => {
    findUserByDiscordId.mockImplementation(() => null);
    const interaction = makeInteraction("guide:leave:7");
    await handleGuideButton(interaction, {}, models);
    expect(createUserToDatabase).not.toHaveBeenCalled();
    expect(removeCourseMemberFromDb).not.toHaveBeenCalled();
    expect(editEphemeral).toHaveBeenCalledWith(interaction, "You are not on **Ohjelmistotuotanto**.");
  });

  test("an instructor cannot leave with the button", async () => {
    findCourseMember.mockImplementation(() => ({ instructor: true }));
    const interaction = makeInteraction("guide:leave:7");
    await handleGuideButton(interaction, {}, models);
    expect(removeCourseMemberFromDb).not.toHaveBeenCalled();
    expect(editErrorEphemeral).toHaveBeenCalledTimes(1);
  });
});

describe("unavailable buttons", () => {
  test("a hidden or deleted course cannot be joined", async () => {
    findCourseFromDbById.mockImplementationOnce(() => ({ ...course, private: true }));
    const interaction = makeInteraction("guide:join:7");
    await handleGuideButton(interaction, {}, models);
    expect(createUserToDatabase).not.toHaveBeenCalled();
    expect(createCourseMemberToDatabase).not.toHaveBeenCalled();
    expect(editErrorEphemeral).toHaveBeenCalledWith(interaction, "This course is not available.");
  });

  test("an old single-button id is rejected", async () => {
    const interaction = makeInteraction("guide:7");
    await handleGuideButton(interaction, {}, models);
    expect(findCourseFromDbById).not.toHaveBeenCalled();
    expect(editErrorEphemeral).toHaveBeenCalledWith(interaction, "This course is not available.");
  });
});

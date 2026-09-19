const { ChannelType } = require("discord.js");
const { execute, autocomplete, data } = require("../../../src/discordBot/commands/faculty/delete_channel");
const { sendEphemeral, editEphemeral, editErrorEphemeral } = require("../../../src/discordBot/services/message");
const { confirmChoice } = require("../../../src/discordBot/services/confirm");
const {
  removeChannelFromDb,
  findChannelFromDbByName,
  findChannelsByCourse
} = require("../../../src/db/services/channelService");
const { findCourseFromDb } = require("../../../src/db/services/courseService");
const { getCourseNameFromCategory } = require("../../../src/discordBot/services/service");

jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/permissions");
const { requireFaculty } = require("../../../src/discordBot/services/permissions");
requireFaculty.mockImplementation(() => true);
jest.mock("../../../src/discordBot/services/confirm");
jest.mock("../../../src/discordBot/services/autocomplete");
const { respondWithChoices } = require("../../../src/discordBot/services/autocomplete");
jest.mock("../../../src/db/services/channelService");
jest.mock("../../../src/db/services/courseService");

const models = require("../../mocks/mockModels");
const { defaultTeacherInteraction, defaultStudentInteraction } = require("../../mocks/mockInteraction");
defaultTeacherInteraction.options = { getString: jest.fn((name) => name) };
defaultStudentInteraction.options = { getString: jest.fn((name) => name) };

const initialResponse = "Deleting text channel...";

const parentChannel = {
  name: "test"
};

jest.mock("../../../src/discordBot/services/service");
confirmChoice.mockImplementation(() => true);
getCourseNameFromCategory.mockImplementation((name) => name.replace("📚", "").trim());
findCourseFromDb.mockImplementationOnce(() => false);
findCourseFromDb.mockImplementation(() => parentChannel);
findChannelFromDbByName.mockImplementationOnce(() => false);
findChannelFromDbByName.mockImplementation(() => true);

afterEach(() => {
  jest.clearAllMocks();
});

describe("slash delete_channel", () => {
  test("Command cannot be used in normal channel", async () => {
    const courseName = "guide";
    const response = "Course not found, can not delete channel.";
    defaultTeacherInteraction.options = { getString: jest.fn(() => courseName) };
    const client = defaultTeacherInteraction.client;
    await execute(defaultTeacherInteraction, client, models);
    expect(confirmChoice).toHaveBeenCalledTimes(0);
    expect(sendEphemeral).toHaveBeenCalledTimes(1);
    expect(sendEphemeral).toHaveBeenCalledWith(defaultTeacherInteraction, initialResponse);
    expect(editErrorEphemeral).toHaveBeenCalledTimes(1);
    expect(editErrorEphemeral).toHaveBeenCalledWith(defaultTeacherInteraction, response);
    expect(removeChannelFromDb).toHaveBeenCalledTimes(0);
  });

  test("Command can be used only in course channels", async () => {
    const courseName = "guide";
    const response = "This command can be used only in course channels";
    defaultTeacherInteraction.options = { getString: jest.fn(() => courseName) };
    defaultTeacherInteraction.channelId = 4;
    const client = defaultTeacherInteraction.client;
    client.guild.channels.create({ name: "notcourse", type: ChannelType.GuildCategory });
    await execute(defaultTeacherInteraction, client, models);
    expect(confirmChoice).toHaveBeenCalledTimes(0);
    expect(sendEphemeral).toHaveBeenCalledTimes(1);
    expect(sendEphemeral).toHaveBeenCalledWith(defaultTeacherInteraction, initialResponse);
    expect(editErrorEphemeral).toHaveBeenCalledTimes(1);
    expect(editErrorEphemeral).toHaveBeenCalledWith(defaultTeacherInteraction, response);
    expect(removeChannelFromDb).toHaveBeenCalledTimes(0);
  });

  test("Originals cannot be deleted", async () => {
    const courseName = "general";
    const response = "Original channels can not be deleted.";
    defaultTeacherInteraction.options = { getString: jest.fn(() => courseName) };
    defaultTeacherInteraction.channelId = 3;
    const client = defaultTeacherInteraction.client;
    await execute(defaultTeacherInteraction, client, models);
    expect(confirmChoice).toHaveBeenCalledTimes(0);
    expect(sendEphemeral).toHaveBeenCalledTimes(1);
    expect(sendEphemeral).toHaveBeenCalledWith(defaultTeacherInteraction, initialResponse);
    expect(editErrorEphemeral).toHaveBeenCalledTimes(1);
    expect(editErrorEphemeral).toHaveBeenCalledWith(defaultTeacherInteraction, response);
    expect(removeChannelFromDb).toHaveBeenCalledTimes(0);
  });

  test("Invalid channel cannot be deleted", async () => {
    const courseName = "invalid";
    const response = "There is no added channel with given name.";
    defaultTeacherInteraction.options = { getString: jest.fn(() => courseName) };
    defaultTeacherInteraction.channelId = 3;
    const client = defaultTeacherInteraction.client;
    await execute(defaultTeacherInteraction, client, models);
    expect(confirmChoice).toHaveBeenCalledTimes(1);
    expect(sendEphemeral).toHaveBeenCalledTimes(1);
    expect(sendEphemeral).toHaveBeenCalledWith(defaultTeacherInteraction, initialResponse);
    expect(editErrorEphemeral).toHaveBeenCalledTimes(1);
    expect(editErrorEphemeral).toHaveBeenCalledWith(defaultTeacherInteraction, response);
    expect(removeChannelFromDb).toHaveBeenCalledTimes(0);
  });

  test("Valid channel can be deleted", async () => {
    const courseName = "test";
    const response = `${courseName} deleted!`;
    defaultTeacherInteraction.options = { getString: jest.fn(() => courseName) };
    defaultTeacherInteraction.channelId = 3;
    const client = defaultTeacherInteraction.client;
    await execute(defaultTeacherInteraction, client, models);
    expect(confirmChoice).toHaveBeenCalledTimes(1);
    expect(removeChannelFromDb).toHaveBeenCalledTimes(1);
    expect(removeChannelFromDb).toHaveBeenCalledWith(`${courseName}_${courseName}`, models.Channel);
    expect(sendEphemeral).toHaveBeenCalledTimes(1);
    expect(sendEphemeral).toHaveBeenCalledWith(defaultTeacherInteraction, initialResponse);
    expect(editEphemeral).toHaveBeenCalledTimes(1);
    expect(editEphemeral).toHaveBeenCalledWith(defaultTeacherInteraction, response);
  });

  test("Command can be declined", async () => {
    confirmChoice.mockImplementation(() => false);
    const courseName = "test";
    const response = "Command declined";
    defaultTeacherInteraction.options = { getString: jest.fn(() => courseName) };
    defaultTeacherInteraction.channelId = 3;
    const client = defaultTeacherInteraction.client;
    await execute(defaultTeacherInteraction, client, models);
    expect(confirmChoice).toHaveBeenCalledTimes(1);
    expect(removeChannelFromDb).toHaveBeenCalledTimes(0);
    expect(sendEphemeral).toHaveBeenCalledTimes(1);
    expect(sendEphemeral).toHaveBeenCalledWith(defaultTeacherInteraction, initialResponse);
    expect(editEphemeral).toHaveBeenCalledTimes(1);
    expect(editEphemeral).toHaveBeenCalledWith(defaultTeacherInteraction, response);
  });

  test("a user without faculty access cannot use the command", async () => {
    const client = defaultStudentInteraction.client;
    requireFaculty.mockImplementationOnce(() => false);
    await execute(defaultStudentInteraction, client, models);
    expect(requireFaculty).toHaveBeenCalledWith(defaultStudentInteraction, models);
    expect(sendEphemeral).not.toHaveBeenCalled();
  });
});

describe("slash delete_channel autocomplete", () => {
  const interaction = { channelId: "current" };
  const buildClient = (parent) => ({ guild: { channels: { cache: new Map([["current", { parent }]]) } } });
  const courseCategory = { name: "📚 test" };

  test("the channel option is autocompleted", () => {
    expect(data.toJSON().options[0].autocomplete).toBe(true);
  });

  test("offers nothing outside a course category", async () => {
    await autocomplete(interaction, buildClient(null), models);
    expect(respondWithChoices).toHaveBeenCalledWith(interaction, []);
  });

  test("offers nothing when the category is not a course", async () => {
    findCourseFromDb.mockImplementationOnce(() => null);
    await autocomplete(interaction, buildClient(courseCategory), models);
    expect(respondWithChoices).toHaveBeenCalledWith(interaction, []);
  });

  test("offers the added channels of the course without the course prefix, in alphabetical order", async () => {
    findCourseFromDb.mockImplementationOnce(() => ({ id: 7, name: "test" }));
    findChannelsByCourse.mockResolvedValueOnce([
      { name: "test_announcement", defaultChannel: true },
      { name: "test_general", defaultChannel: true },
      { name: "test_voice", defaultChannel: true },
      { name: "test_feedback", defaultChannel: false },
      { name: "test_ask-here", defaultChannel: false }
    ]);
    await autocomplete(interaction, buildClient(courseCategory), models);
    expect(findChannelsByCourse).toHaveBeenCalledWith(7, models.Channel);
    expect(respondWithChoices).toHaveBeenCalledWith(interaction, [
      { name: "ask-here", value: "ask-here" },
      { name: "feedback", value: "feedback" }
    ]);
  });
});

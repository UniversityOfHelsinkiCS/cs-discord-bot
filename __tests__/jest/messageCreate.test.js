const { execute } = require("../../src/discordBot/events/messageCreate");
const { execute: joinCommand } = require("../../src/discordBot/commands/student/join");
const { sendReplyMessage } = require("../../src/discordBot/services/message");
const { findCourseFromDb } = require("../../src/db/services/courseService");
const { messageInCommandsChannel, student } = require("../mocks/mockMessages");
const models = require("../mocks/mockModels");

jest.mock("../../src/discordBot/services/message");
jest.mock("../../src/discordBot/services/service");
jest.mock("../../src/db/services/courseService");
jest.mock("../../src/db/services/userService");
jest.mock("../../src/discordBot/commands/student/join", () => {
  const originalModule = jest.requireActual("../../src/discordBot/commands/student/join");

  return {
    ...originalModule,
    execute: jest.fn().mockImplementation(() => true)
  };
});

const course = { name: "test", fullName: "test course", code: "101", private: false };
findCourseFromDb.mockImplementation(() => course);

const client = messageInCommandsChannel.client;
const send = (content, overrides = {}) => {
  messageInCommandsChannel.content = content;
  messageInCommandsChannel.author = student;
  messageInCommandsChannel.member = student;
  Object.assign(messageInCommandsChannel, overrides);
  return execute(messageInCommandsChannel, client, models);
};

afterEach(() => {
  jest.clearAllMocks();
});

describe("copy-pasted slash commands", () => {
  test("a copy-pasted join command is executed with the course name", async () => {
    await send("/join test");
    expect(joinCommand).toHaveBeenCalledTimes(1);
    expect(joinCommand).toHaveBeenCalledWith(messageInCommandsChannel, client, models);
    expect(messageInCommandsChannel.roleString).toBe("test");
    expect(sendReplyMessage).not.toHaveBeenCalled();
  });

  test("the command name and course are matched case-insensitively", async () => {
    await send("/JOIN TeSt");
    expect(joinCommand).toHaveBeenCalledTimes(1);
    expect(messageInCommandsChannel.roleString).toBe("test");
  });

  test("join without a course name gets the guide reply", async () => {
    await send("/join");
    expect(joinCommand).not.toHaveBeenCalled();
    expect(sendReplyMessage).toHaveBeenCalledTimes(1);
    expect(sendReplyMessage).toHaveBeenCalledWith(
      messageInCommandsChannel,
      messageInCommandsChannel.channel,
      expect.stringContaining("I didn't quite catch what you meant")
    );
  });

  test("an unknown slash command gets the guide reply", async () => {
    await send("/unvalidCommand");
    expect(sendReplyMessage).toHaveBeenCalledTimes(1);
    expect(joinCommand).not.toHaveBeenCalled();
  });

  test("other known slash commands are left alone", async () => {
    await send("/help");
    expect(sendReplyMessage).not.toHaveBeenCalled();
    expect(joinCommand).not.toHaveBeenCalled();
  });
});

describe("other messages", () => {
  test("plain messages are ignored", async () => {
    await send("hello there");
    expect(sendReplyMessage).not.toHaveBeenCalled();
    expect(joinCommand).not.toHaveBeenCalled();
  });

  test("the old ! prefix commands no longer do anything", async () => {
    await send("!sort_courses");
    expect(sendReplyMessage).not.toHaveBeenCalled();
    expect(messageInCommandsChannel.react).not.toHaveBeenCalled();
    expect(messageInCommandsChannel.reply).not.toHaveBeenCalled();
    expect(messageInCommandsChannel.channel.send).not.toHaveBeenCalled();
  });

  test("messages from bots are ignored", async () => {
    await send("/join test", { author: { ...student, bot: true } });
    expect(joinCommand).not.toHaveBeenCalled();
  });

  test("messages without a member are ignored", async () => {
    await send("/join test", { member: null });
    expect(joinCommand).not.toHaveBeenCalled();
  });
});

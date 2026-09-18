require("dotenv").config({ quiet: true });
const { execute } = require("../../src/discordBot/events/messageCreate");
const { execute: joinCommand } = require("../../src/discordBot/commands/student/join");
const { sendReplyMessage } = require("../../src/discordBot/services/message");
const { findCourseFromDb } = require("../../src/db/services/courseService");
const { messageInGuideChannel, messageInCommandsChannel, student, teacher } = require("../mocks/mockMessages");
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

const prefix = process.env.PREFIX;

const course = { name: "test", fullName: "test course", code: "101", private: false };
findCourseFromDb.mockImplementation(() => course);

const plainCommand = { prefix: true, name: "fake_plain", role: "admin", execute: jest.fn() };
const argsCommand = { prefix: true, name: "fake_args", role: "admin", args: true, execute: jest.fn() };
const emitCommand = { prefix: true, name: "fake_emit", role: "admin", emit: true, execute: jest.fn() };

beforeAll(() => {
  const client = messageInCommandsChannel.client;
  [plainCommand, argsCommand, emitCommand].forEach((command) => client.commands.set(command.name, command));
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("prefix commands", () => {
  test("commands cannot be used in guide channel", async () => {
    messageInGuideChannel.content = `${prefix}fake_plain`;
    const client = messageInGuideChannel.client;
    await execute(messageInGuideChannel, client);
    expect(messageInGuideChannel.channel.send).toHaveBeenCalledTimes(0);
    expect(messageInGuideChannel.react).toHaveBeenCalledTimes(0);
    expect(messageInGuideChannel.reply).toHaveBeenCalledTimes(0);
    expect(plainCommand.execute).toHaveBeenCalledTimes(0);
  });

  test("invalid command in commands channel does nothing", async () => {
    messageInCommandsChannel.content = `${prefix}invalid test`;
    const client = messageInCommandsChannel.client;
    await execute(messageInCommandsChannel, client);
    expect(messageInCommandsChannel.channel.send).toHaveBeenCalledTimes(0);
    expect(messageInCommandsChannel.react).toHaveBeenCalledTimes(0);
    expect(messageInCommandsChannel.reply).toHaveBeenCalledTimes(0);
  });

  test("copypasted join command is executed", async () => {
    messageInCommandsChannel.content = "/join test";
    const client = messageInCommandsChannel.client;
    await execute(messageInCommandsChannel, client, models);
    expect(joinCommand).toHaveBeenCalledTimes(1);
    expect(messageInCommandsChannel.channel.send).toHaveBeenCalledTimes(0);
    expect(messageInCommandsChannel.react).toHaveBeenCalledTimes(0);
    expect(messageInCommandsChannel.reply).toHaveBeenCalledTimes(0);
  });

  test("valid command in commands channel is executed", async () => {
    messageInCommandsChannel.content = `${prefix}fake_plain`;
    const client = messageInCommandsChannel.client;
    await execute(messageInCommandsChannel, client, models);
    expect(plainCommand.execute).toHaveBeenCalledTimes(1);
  });

  test("invalid use of command sends correct message", async () => {
    messageInCommandsChannel.content = `${prefix}fake_args`;
    const msg = `You didn't provide any arguments, ${messageInCommandsChannel.author}!`;
    const response = { content: msg, reply: { messageReference: messageInCommandsChannel.id } };
    const client = messageInCommandsChannel.client;
    await execute(messageInCommandsChannel, client);
    expect(messageInCommandsChannel.channel.send).toHaveBeenCalledTimes(1);
    expect(messageInCommandsChannel.channel.send).toHaveBeenCalledWith(response);
    expect(messageInCommandsChannel.react).toHaveBeenCalledTimes(0);
    expect(messageInCommandsChannel.reply).toHaveBeenCalledTimes(0);
    expect(argsCommand.execute).toHaveBeenCalledTimes(0);
  });

  test("if no command role do nothing", async () => {
    messageInCommandsChannel.content = `${prefix}fake_plain`;
    const client = messageInCommandsChannel.client;
    messageInCommandsChannel.author = student;
    messageInCommandsChannel.member = student;
    await execute(messageInCommandsChannel, client);
    expect(messageInCommandsChannel.channel.send).toHaveBeenCalledTimes(0);
    expect(messageInCommandsChannel.react).toHaveBeenCalledTimes(0);
    expect(messageInCommandsChannel.reply).toHaveBeenCalledTimes(0);
    expect(plainCommand.execute).toHaveBeenCalledTimes(0);
  });

  test("if command has emit parameter call client emit", async () => {
    messageInCommandsChannel.content = `${prefix}fake_emit test`;
    const client = messageInCommandsChannel.client;
    messageInCommandsChannel.author = teacher;
    messageInCommandsChannel.member = teacher;
    await execute(messageInCommandsChannel, client, models);
    expect(messageInCommandsChannel.channel.send).toHaveBeenCalledTimes(0);
    expect(messageInCommandsChannel.reply).toHaveBeenCalledTimes(0);
    expect(emitCommand.execute).toHaveBeenCalledTimes(1);
    expect(messageInCommandsChannel.react).toHaveBeenCalledTimes(1);
    expect(messageInCommandsChannel.react).toHaveBeenCalledWith("✅");
    expect(client.emit).toHaveBeenCalledTimes(1);
  });
});

describe("Unknown slash commands", () => {
  test("unknown slash command is met with correct response", async () => {
    messageInCommandsChannel.content = "/unvalidCommand";
    const client = messageInCommandsChannel.client;
    messageInCommandsChannel.author = student;
    messageInCommandsChannel.member = student;
    await execute(messageInCommandsChannel, client);
    expect(messageInCommandsChannel.channel.send).toHaveBeenCalledTimes(0);
    expect(messageInCommandsChannel.react).toHaveBeenCalledTimes(0);
    expect(messageInCommandsChannel.reply).toHaveBeenCalledTimes(0);
    expect(sendReplyMessage).toHaveBeenCalledTimes(1);
  });
});

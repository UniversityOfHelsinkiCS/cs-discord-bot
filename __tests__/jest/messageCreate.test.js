const { execute } = require("../../src/discordBot/events/messageCreate");
const { firewall } = require("../../src/discordBot/services/firewall");
const { messageInCommandsChannel, student } = require("../mocks/mockMessages");

jest.mock("../../src/discordBot/services/firewall");

const client = messageInCommandsChannel.client;
const send = (content, overrides = {}) => {
  messageInCommandsChannel.content = content;
  messageInCommandsChannel.author = student;
  messageInCommandsChannel.member = student;
  Object.assign(messageInCommandsChannel, overrides);
  return execute(messageInCommandsChannel, client);
};

afterEach(() => {
  jest.clearAllMocks();
});

describe("messageCreate", () => {
  test("member messages are passed to the firewall", async () => {
    await send("hello there");
    expect(firewall).toHaveBeenCalledTimes(1);
    expect(firewall).toHaveBeenCalledWith(messageInCommandsChannel, client);
  });

  test("copy-pasted slash commands get no reply", async () => {
    await send("/join test");
    expect(messageInCommandsChannel.reply).not.toHaveBeenCalled();
    expect(messageInCommandsChannel.channel.send).not.toHaveBeenCalled();
  });

  test("messages from bots are ignored", async () => {
    await send("hello", { author: { ...student, bot: true } });
    expect(firewall).not.toHaveBeenCalled();
  });

  test("messages without a member are ignored", async () => {
    await send("hello", { member: null });
    expect(firewall).not.toHaveBeenCalled();
  });
});

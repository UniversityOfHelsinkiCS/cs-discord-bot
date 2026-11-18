const { MessageFlags } = require("discord.js");
const {
  sendErrorReport,
  sendErrorEphemeral,
  sendEphemeral,
  editEphemeral,
  editEphemeralWithComponents,
  editEphemeralClearComponents,
  editErrorEphemeral,
  splitIntoChunks
} = require("../../src/discordBot/services/message");

const { defaultAdminInteraction } = require("../mocks/mockInteraction");

afterEach(() => {
  jest.clearAllMocks();
});

describe("message service", () => {
  test("errors sent to commands channel", async () => {
    const client = defaultAdminInteraction.client;
    const commandChannel = client.guild.channels.cache.find((c) => c.name === "commands");
    const channel = client.guild.channels.cache.get(defaultAdminInteraction.channelId);
    const error = "faked error";
    const msg = `**ERROR DETECTED!**\nMember: admin\nCommand: ${defaultAdminInteraction.commandName}\nChannel: ${channel.name}`;
    await sendErrorReport(defaultAdminInteraction, client, error);
    expect(commandChannel.send).toHaveBeenCalledTimes(2);
    expect(commandChannel.send).toHaveBeenCalledWith({ content: msg });
    expect(commandChannel.send).toHaveBeenCalledWith({ content: error });
  });

  test("error report from a button in an uncached channel", async () => {
    const client = defaultAdminInteraction.client;
    const commandChannel = client.guild.channels.cache.find((c) => c.name === "commands");
    const interaction = {
      member: { displayName: "admin" },
      customId: "guide:join:1",
      channelId: "thread-1",
      channel: { name: "help-thread" }
    };
    await sendErrorReport(interaction, client, "x".repeat(3000));
    expect(commandChannel.send).toHaveBeenCalledWith({
      content: "**ERROR DETECTED!**\nMember: admin\nCommand: button guide:join:1\nChannel: help-thread"
    });
    expect(commandChannel.send).toHaveBeenCalledWith({ content: "x".repeat(2000) });
  });

  test("long text is split on line breaks under the Discord limit", () => {
    const lines = Array.from({ length: 100 }, (_, i) => `<@${i}> ${"x".repeat(40)}`);
    const chunks = splitIntoChunks(lines.join("\n"));
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(2000));
    expect(chunks.join("\n")).toBe(lines.join("\n"));
  });

  test("a single line over the limit is cut into pieces", () => {
    const chunks = splitIntoChunks("y".repeat(4500));
    expect(chunks.map((chunk) => chunk.length)).toEqual([2000, 2000, 500]);
  });

  test("error ephemeral", async () => {
    const msg = "fake message";
    await sendErrorEphemeral(defaultAdminInteraction, msg);
    expect(defaultAdminInteraction.reply).toHaveBeenCalledTimes(1);
    expect(defaultAdminInteraction.reply).toHaveBeenCalledWith({
      content: `Error: ${msg}`,
      flags: MessageFlags.Ephemeral
    });
  });

  test("ephemeral", async () => {
    const msg = "fake message";
    await sendEphemeral(defaultAdminInteraction, msg);
    expect(defaultAdminInteraction.reply).toHaveBeenCalledTimes(1);
    expect(defaultAdminInteraction.reply).toHaveBeenCalledWith({ content: `${msg}`, flags: MessageFlags.Ephemeral });
  });

  test("edit ephemeral", async () => {
    const msg = "edited";
    await sendEphemeral(defaultAdminInteraction, "Wait...");
    await editEphemeral(defaultAdminInteraction, msg);
    expect(defaultAdminInteraction.reply).toHaveBeenCalledTimes(1);
    expect(defaultAdminInteraction.reply).toHaveBeenCalledWith({ content: "Wait...", flags: MessageFlags.Ephemeral });
    expect(defaultAdminInteraction.editReply).toHaveBeenCalledTimes(1);
    expect(defaultAdminInteraction.editReply).toHaveBeenCalledWith({ content: `${msg}` });
  });

  test("edit error ephemeral", async () => {
    const msg = "fake message";
    await sendEphemeral(defaultAdminInteraction, "Wait...");
    await editErrorEphemeral(defaultAdminInteraction, msg);
    expect(defaultAdminInteraction.reply).toHaveBeenCalledTimes(1);
    expect(defaultAdminInteraction.reply).toHaveBeenCalledWith({ content: "Wait...", flags: MessageFlags.Ephemeral });
    expect(defaultAdminInteraction.editReply).toHaveBeenCalledTimes(1);
    expect(defaultAdminInteraction.editReply).toHaveBeenCalledWith({ content: `Error: ${msg}` });
  });

  test("edit ephemeral with components", async () => {
    const msg = "Here's the components";
    const components = "components";
    await sendEphemeral(defaultAdminInteraction, "Wait...");
    await editEphemeralWithComponents(defaultAdminInteraction, msg, components);
    expect(defaultAdminInteraction.reply).toHaveBeenCalledTimes(1);
    expect(defaultAdminInteraction.reply).toHaveBeenCalledWith({ content: "Wait...", flags: MessageFlags.Ephemeral });
    expect(defaultAdminInteraction.editReply).toHaveBeenCalledTimes(1);
    expect(defaultAdminInteraction.editReply).toHaveBeenCalledWith({
      content: `${msg}`,
      components: [components]
    });
  });

  test("edit ephemeral clear components", async () => {
    const msg = "Components cleared";
    await sendEphemeral(defaultAdminInteraction, "Wait...");
    await editEphemeralClearComponents(defaultAdminInteraction, msg);
    expect(defaultAdminInteraction.reply).toHaveBeenCalledTimes(1);
    expect(defaultAdminInteraction.reply).toHaveBeenCalledWith({ content: "Wait...", flags: MessageFlags.Ephemeral });
    expect(defaultAdminInteraction.editReply).toHaveBeenCalledTimes(1);
    expect(defaultAdminInteraction.editReply).toHaveBeenCalledWith({
      content: `${msg}`,
      components: []
    });
  });
});

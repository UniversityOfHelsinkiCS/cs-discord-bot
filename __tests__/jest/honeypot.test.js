const { ChannelType } = require("discord.js");
const Discord = require("discord.js");
const { setInitialHoneypotMessage, HONEYPOT_CHANNEL_NAME } = require("../../src/discordBot/services/honeypot");

const HONEYPOT_MESSAGE_TRIMMED = `# Tämä on ansa boteille. Älä laita viestiä tänne tai sinut saatetaan poistaa serveriltä.

# Det här är en fälla för bottar. Posta inte här, annars riskerar du att bli utkastad.

# This is a trap for bots. Do not post here or you might get kicked.`;

const OUTDATED_HONEYPOT_MESSAGE = HONEYPOT_MESSAGE_TRIMMED.replace("laita viestiä", "laitaviestiä");
const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;

const makeMessage = (id, content, { bot = false, createdTimestamp = Date.now() } = {}) => ({
  id,
  content,
  author: { bot },
  createdTimestamp,
  pin: jest.fn(),
  edit: jest.fn(),
  delete: jest.fn(() => Promise.resolve())
});

const makeChannel = ({ messages = [], pinnedIds = [] } = {}) => {
  const collection = new Discord.Collection();
  messages.forEach((m) => collection.set(m.id, Object.assign(m, { pinned: pinnedIds.includes(m.id) })));

  return {
    type: ChannelType.GuildText,
    name: HONEYPOT_CHANNEL_NAME,
    messages: {
      fetch: jest.fn(() => Promise.resolve(collection)),
      fetchPins: jest.fn(() => ({
        items: [...collection.filter((m) => m.pinned).values()].map((message) => ({ message }))
      }))
    },
    bulkDelete: jest.fn(() => Promise.resolve()),
    send: jest.fn((content) => makeMessage("new", content, { bot: true }))
  };
};

const makeGuild = (channel) => ({
  channels: {
    cache: {
      find: (predicate) => [channel].filter(Boolean).find(predicate)
    }
  }
});

describe("setInitialHoneypotMessage", () => {
  test("logs an error and does nothing when the honeypot channel is missing", async () => {
    console.error = jest.fn();
    const guild = makeGuild(null);

    await setInitialHoneypotMessage(guild);

    expect(console.error).toHaveBeenCalledWith("Honeypot channel not found!");
  });

  test("sends and pins the info message when the channel is empty", async () => {
    const channel = makeChannel();

    await setInitialHoneypotMessage(makeGuild(channel));

    expect(channel.send).toHaveBeenCalledWith(expect.stringContaining("This is a trap for bots"));
    const sentMessage = channel.send.mock.results[0].value;
    expect(sentMessage.pin).toHaveBeenCalledTimes(1);
    expect(channel.bulkDelete).not.toHaveBeenCalled();
  });

  test("does not resend, edit or re-pin when the current info message is already pinned", async () => {
    const infoMessage = makeMessage("info", HONEYPOT_MESSAGE_TRIMMED, { bot: true });
    const channel = makeChannel({ messages: [infoMessage], pinnedIds: ["info"] });

    await setInitialHoneypotMessage(makeGuild(channel));

    expect(channel.send).not.toHaveBeenCalled();
    expect(infoMessage.edit).not.toHaveBeenCalled();
    expect(infoMessage.delete).not.toHaveBeenCalled();
  });

  test("edits an outdated pinned info message instead of sending a new one", async () => {
    const infoMessage = makeMessage("info", OUTDATED_HONEYPOT_MESSAGE, { bot: true });
    const channel = makeChannel({ messages: [infoMessage], pinnedIds: ["info"] });

    await setInitialHoneypotMessage(makeGuild(channel));

    expect(channel.send).not.toHaveBeenCalled();
    expect(infoMessage.edit).toHaveBeenCalledWith(expect.stringContaining("Älä laita viestiä"));
    expect(infoMessage.delete).not.toHaveBeenCalled();
  });

  test("keeps the current info message and deletes the outdated duplicate", async () => {
    const outdated = makeMessage("old-info", OUTDATED_HONEYPOT_MESSAGE, { bot: true });
    const current = makeMessage("info", HONEYPOT_MESSAGE_TRIMMED, { bot: true });
    const channel = makeChannel({ messages: [outdated, current], pinnedIds: ["old-info", "info"] });

    await setInitialHoneypotMessage(makeGuild(channel));

    expect(outdated.delete).toHaveBeenCalledTimes(1);
    expect(current.delete).not.toHaveBeenCalled();
    expect(current.edit).not.toHaveBeenCalled();
    expect(channel.send).not.toHaveBeenCalled();
  });

  test("keeps messages pinned by people", async () => {
    const infoMessage = makeMessage("info", HONEYPOT_MESSAGE_TRIMMED, { bot: true });
    const staffPin = makeMessage("staff", "note from staff");
    const channel = makeChannel({ messages: [infoMessage, staffPin], pinnedIds: ["info", "staff"] });

    await setInitialHoneypotMessage(makeGuild(channel));

    expect(staffPin.delete).not.toHaveBeenCalled();
    expect(channel.bulkDelete).not.toHaveBeenCalled();
  });

  test("bulk deletes recent stray messages and deletes older ones one by one", async () => {
    const infoMessage = makeMessage("info", HONEYPOT_MESSAGE_TRIMMED, { bot: true });
    const spam1 = makeMessage("spam1", "buy my nft");
    const spam2 = makeMessage("spam2", "free discord nitro");
    const oldSpam = makeMessage("old", "ancient spam", { createdTimestamp: Date.now() - THREE_WEEKS_MS });
    const channel = makeChannel({ messages: [infoMessage, spam1, spam2, oldSpam], pinnedIds: ["info"] });

    await setInitialHoneypotMessage(makeGuild(channel));

    expect(channel.send).not.toHaveBeenCalled();
    expect(channel.bulkDelete).toHaveBeenCalledTimes(1);
    expect([...channel.bulkDelete.mock.calls[0][0].keys()]).toEqual(["spam1", "spam2"]);
    expect(oldSpam.delete).toHaveBeenCalledTimes(1);
    expect(infoMessage.delete).not.toHaveBeenCalled();
  });

  test("sends and pins the info message when only stray messages exist", async () => {
    const spam = makeMessage("spam1", "buy my nft");
    const channel = makeChannel({ messages: [spam] });

    await setInitialHoneypotMessage(makeGuild(channel));

    expect(spam.delete).toHaveBeenCalledTimes(1);
    expect(channel.send).toHaveBeenCalledTimes(1);
    const sentMessage = channel.send.mock.results[0].value;
    expect(sentMessage.pin).toHaveBeenCalledTimes(1);
  });
});

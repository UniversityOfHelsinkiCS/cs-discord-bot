const Discord = require("discord.js");
const { setInitialHoneypotMessage, HONEYPOT_CHANNEL_NAME } = require("../../src/discordBot/services/honeypot");

const HONEYPOT_MESSAGE_TRIMMED = `# Tämä on ansa boteille. Älä laitaviestiä tänne tai sinut saatetaan poistaa serveriltä.

# Det här är en fälla för bottar. Posta inte här, annars riskerar du att bli utkastad.

# This is a trap for bots. Do not post here or you might get kicked.`;

const makeMessage = (id, content, pinned = false) => ({
  id,
  content,
  pinned,
  pin: jest.fn(),
});

const makeChannel = ({ messages = [], pinnedIds = [] } = {}) => {
  const collection = new Discord.Collection();
  messages.forEach(m => collection.set(m.id, { ...m, pinned: pinnedIds.includes(m.id) }));

  return {
    type: "GUILD_TEXT",
    name: HONEYPOT_CHANNEL_NAME,
    messages: {
      fetch: jest.fn(() => collection),
      fetchPinned: jest.fn(() => collection.filter(m => m.pinned)),
    },
    bulkDelete: jest.fn(),
    send: jest.fn((content) => makeMessage("new", content)),
  };
};

const makeGuild = (channel) => ({
  channels: {
    cache: {
      find: (predicate) => [channel].filter(Boolean).find(predicate),
    },
  },
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
    const guild = makeGuild(channel);

    await setInitialHoneypotMessage(guild);

    expect(channel.send).toHaveBeenCalledWith(expect.stringContaining("This is a trap for bots"));
    const sentMessage = channel.send.mock.results[0].value;
    expect(sentMessage.pin).toHaveBeenCalledTimes(1);
    expect(channel.bulkDelete).not.toHaveBeenCalled();
  });

  test("does not resend or re-pin when the trimmed info message is already pinned", async () => {
    const infoMessage = makeMessage("info", HONEYPOT_MESSAGE_TRIMMED, true);
    const channel = makeChannel({ messages: [infoMessage], pinnedIds: ["info"] });
    const guild = makeGuild(channel);

    await setInitialHoneypotMessage(guild);

    expect(channel.send).not.toHaveBeenCalled();
    expect(channel.bulkDelete).not.toHaveBeenCalled();
  });

  test("bulk deletes stray messages but keeps the pinned info message", async () => {
    const infoMessage = makeMessage("info", HONEYPOT_MESSAGE_TRIMMED, true);
    const spam1 = makeMessage("spam1", "buy my nft");
    const spam2 = makeMessage("spam2", "free discord nitro");
    const channel = makeChannel({ messages: [infoMessage, spam1, spam2], pinnedIds: ["info"] });
    const guild = makeGuild(channel);

    await setInitialHoneypotMessage(guild);

    expect(channel.send).not.toHaveBeenCalled();
    expect(channel.bulkDelete).toHaveBeenCalledTimes(1);
    const [deletedMessages, filterOld] = channel.bulkDelete.mock.calls[0];
    expect([...deletedMessages.keys()]).toEqual(["spam1", "spam2"]);
    expect(filterOld).toBe(true);
  });

  test("sends and pins the info message when only stray messages exist", async () => {
    const spam = makeMessage("spam1", "buy my nft");
    const channel = makeChannel({ messages: [spam] });
    const guild = makeGuild(channel);

    await setInitialHoneypotMessage(guild);

    expect(channel.bulkDelete).toHaveBeenCalledTimes(1);
    expect(channel.send).toHaveBeenCalledTimes(1);
    const sentMessage = channel.send.mock.results[0].value;
    expect(sentMessage.pin).toHaveBeenCalledTimes(1);
  });
});

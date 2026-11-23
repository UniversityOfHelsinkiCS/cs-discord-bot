const { RESTJSONErrorCodes } = require("discord.js");
const { firewall, resetHoneypotState, resumePendingUnbans } = require("../../src/discordBot/services/firewall");
const { HONEYPOT_CHANNEL_NAME } = require("../../src/discordBot/services/honeypot");
const { sendReportToCommandsChannel } = require("../../src/discordBot/services/message");

const { matchScamImages } = require("../../src/discordBot/services/scamImageMatcher");
const { addPendingUnban, removePendingUnban, listPendingUnbans } = require("../../src/db/services/pendingUnbanService");

jest.mock("../../src/discordBot/services/message");
jest.mock("../../src/discordBot/services/logger", () => ({ logError: jest.fn() }));
jest.mock("../../src/discordBot/services/scamImageMatcher", () => ({
  matchScamImages: jest.fn(async (images) => ({
    total: images.length,
    matchedCount: 0,
    scamNames: [],
    allMatch: false,
    partialMatch: false
  }))
}));

jest.mock("../../src/db/services/scamImageService", () => ({ getKnownScamImages: jest.fn(async () => []) }));
jest.mock("../../src/db/services/pendingUnbanService", () => ({
  addPendingUnban: jest.fn(async (discordId, unbanAt) => ({ id: `pending-${discordId}`, discordId, unbanAt })),
  removePendingUnban: jest.fn(async () => 1),
  listPendingUnbans: jest.fn(async () => [])
}));

const hashMatch = (matchedCount, total) => ({
  total,
  matchedCount,
  scamNames: ["story"],
  allMatch: matchedCount === total,
  partialMatch: matchedCount >= 2 && matchedCount < total
});

const SCAM_IMAGES = [
  { contentType: "image/jpeg", name: "img1.jpg", size: 1000, width: 1920, height: 2560, url: "http://example.com/1" },
  { contentType: "image/jpeg", name: "img2.jpg", size: 1000, width: 1920, height: 2560, url: "http://example.com/2" },
  { contentType: "image/jpeg", name: "img3.jpg", size: 1000, width: 1920, height: 2560, url: "http://example.com/3" },
  { contentType: "image/png", name: "img4.png", size: 500, width: 828, height: 1012, url: "http://example.com/4" }
];

const SUSPICIOUS_IMAGES = [
  { contentType: "image/jpeg", name: "a.jpg", size: 100, width: 100, height: 200, url: "http://example.com/a" },
  { contentType: "image/jpeg", name: "b.jpg", size: 100, width: 300, height: 400, url: "http://example.com/b" },
  { contentType: "image/jpeg", name: "c.jpg", size: 100, width: 500, height: 600, url: "http://example.com/c" },
  { contentType: "image/jpeg", name: "d.jpg", size: 100, width: 700, height: 800, url: "http://example.com/d" }
];
const REPORT_DELAY_MS = 60 * 1000;
const UNBAN_DELAY_MS = 60 * 1000;

const makeAttachments = (allAttachments) => ({
  filter: jest.fn((fn) => {
    const filtered = allAttachments.filter(fn);
    return {
      size: filtered.length,
      map: (mapFn) => filtered.map(mapFn)
    };
  }),
  size: allAttachments.length,
  values: () => allAttachments[Symbol.iterator]()
});

const makeCollection = (items = []) => {
  const arr = [...items];
  return {
    filter: (fn) => makeCollection(arr.filter(fn)),
    size: arr.length,
    first: () => arr[0],
    values: () => arr[Symbol.iterator]()
  };
};

let authorCounter = 0;
const makeMessage = ({
  isBot = false,
  hasMember = true,
  attachments = SCAM_IMAGES,
  authorId,
  channelName = "chat",
  content = "",
  pinned = false,
  extraChannelMessages = [],
  roleNames = []
} = {}) => {
  const id = authorId ?? `user-${++authorCounter}`;
  const roles = roleNames.map((name) => ({ name }));
  const msg = {
    author: { bot: isBot, id, tag: "user#0001", send: jest.fn().mockResolvedValue() },
    member: hasMember
      ? {
          displayName: "Test User",
          kick: jest.fn().mockResolvedValue(),
          roles: { cache: { some: (fn) => roles.some(fn) } }
        }
      : null,
    guild: {
      members: { ban: jest.fn().mockResolvedValue({ id }), unban: jest.fn().mockResolvedValue() }
    },
    url: "https://discord.com/channels/guild/channel-123/msg-456",
    attachments: makeAttachments(attachments),
    content,
    delete: jest.fn().mockResolvedValue(),
    pinned,
    createdTimestamp: Date.now()
  };
  msg.channel = {
    id: "channel-123",
    name: channelName,
    messages: {
      fetch: jest.fn().mockResolvedValue(makeCollection([msg, ...extraChannelMessages]))
    },
    bulkDelete: jest.fn().mockResolvedValue()
  };
  return msg;
};

const client = {};
const models = { PendingUnban: {} };

afterEach(() => {
  jest.clearAllMocks();
  resetHoneypotState();
});

describe("firewall", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("ignores bot messages", async () => {
    const msg = makeMessage({ isBot: true });
    await firewall(msg, client, models);
    expect(msg.attachments.filter).not.toHaveBeenCalled();
    expect(sendReportToCommandsChannel).not.toHaveBeenCalled();
  });

  test("ignores messages without a guild member", async () => {
    const msg = makeMessage({ hasMember: false });
    await firewall(msg, client, models);
    expect(msg.attachments.filter).not.toHaveBeenCalled();
    expect(sendReportToCommandsChannel).not.toHaveBeenCalled();
  });

  test("does nothing for messages with fewer than 4 images", async () => {
    const msg = makeMessage({ attachments: SCAM_IMAGES.slice(0, 3) });
    await firewall(msg, client, models);
    expect(msg.delete).not.toHaveBeenCalled();
    expect(sendReportToCommandsChannel).not.toHaveBeenCalled();
  });

  test("does nothing for messages with more than 4 images", async () => {
    const extra = {
      contentType: "image/jpeg",
      name: "extra.jpg",
      size: 100,
      width: 100,
      height: 100,
      url: "http://example.com/5"
    };
    const msg = makeMessage({ attachments: [...SCAM_IMAGES, extra] });
    await firewall(msg, client, models);
    expect(msg.delete).not.toHaveBeenCalled();
    expect(sendReportToCommandsChannel).not.toHaveBeenCalled();
  });

  test("does nothing when 4 attachments are not images", async () => {
    const nonImages = [
      { contentType: "application/pdf", name: "a.pdf", size: 100 },
      { contentType: "application/pdf", name: "b.pdf", size: 100 },
      { contentType: "text/plain", name: "c.txt", size: 100 },
      { contentType: "text/plain", name: "d.txt", size: 100 }
    ];
    const msg = makeMessage({ attachments: nonImages });
    await firewall(msg, client, models);
    expect(msg.delete).not.toHaveBeenCalled();
    expect(sendReportToCommandsChannel).not.toHaveBeenCalled();
  });

  test("reports 4 images that do not match a known scam fingerprint", async () => {
    const msg = makeMessage({ attachments: SUSPICIOUS_IMAGES });
    await firewall(msg, client, models);
    await jest.advanceTimersByTimeAsync(REPORT_DELAY_MS);
    expect(msg.delete).not.toHaveBeenCalled();
    expect(sendReportToCommandsChannel).toHaveBeenCalledTimes(1);
    const [, content] = sendReportToCommandsChannel.mock.calls[0];
    expect(content).toContain("POSSIBLE SCAM IMAGES DETECTED");
  });

  test("deletes message, DMs user, bans+unbans member, and reports when scam fingerprint matches", async () => {
    const msg = makeMessage();
    await firewall(msg, client, models);
    expect(msg.delete).toHaveBeenCalledTimes(1);
    expect(msg.author.send).toHaveBeenCalledTimes(1);
    expect(msg.guild.members.ban).toHaveBeenCalledTimes(1);
    expect(msg.guild.members.unban).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(UNBAN_DELAY_MS);
    expect(msg.guild.members.unban).toHaveBeenCalledTimes(1);
    expect(sendReportToCommandsChannel).toHaveBeenCalledTimes(1);
    const [, content] = sendReportToCommandsChannel.mock.calls[0];
    expect(content).toContain("SCAM MESSAGE DETECTED AND REMOVED");
  });

  test("report includes member mention, channel link, and image count", async () => {
    const msg = makeMessage();
    await firewall(msg, client, models);
    const [, content] = sendReportToCommandsChannel.mock.calls[0];
    expect(content).toContain(`<@${msg.author.id}>`);
    expect(content).toContain("<#channel-123>");
    expect(content).toContain("Count: 4");
  });

  test("possible scam report includes message link", async () => {
    const msg = makeMessage({ attachments: SUSPICIOUS_IMAGES });
    await firewall(msg, client, models);
    await jest.advanceTimersByTimeAsync(REPORT_DELAY_MS);
    const [, content] = sendReportToCommandsChannel.mock.calls[0];
    expect(content).toContain(msg.url);
  });

  test("confirmed scam report does not include message link", async () => {
    const msg = makeMessage();
    await firewall(msg, client, models);
    const [, content] = sendReportToCommandsChannel.mock.calls[0];
    expect(content).not.toContain(msg.url);
  });

  test("report passes image URLs as files", async () => {
    const msg = makeMessage();
    await firewall(msg, client, models);
    const [, , files] = sendReportToCommandsChannel.mock.calls[0];
    expect(files).toHaveLength(4);
    expect(files).toContain("http://example.com/1");
  });

  test("cooldown prevents duplicate reports from the same user within 2 minutes", async () => {
    const authorId = "cooldown-test-user";
    const msg1 = makeMessage({ authorId });
    const msg2 = makeMessage({ authorId });
    await firewall(msg1, client, models);
    await firewall(msg2, client, models);
    expect(sendReportToCommandsChannel).toHaveBeenCalledTimes(1);
  });

  test("different users are each reported independently", async () => {
    const msg1 = makeMessage({ authorId: "user-a" });
    const msg2 = makeMessage({ authorId: "user-b" });
    await firewall(msg1, client, models);
    await firewall(msg2, client, models);
    expect(sendReportToCommandsChannel).toHaveBeenCalledTimes(2);
  });
});

describe("honeypot detection", () => {
  const TEXT = "free nitro click here";

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("message in honeypot only - no kick", async () => {
    const msg = makeMessage({ channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    await firewall(msg, client, models);
    expect(msg.guild.members.ban).not.toHaveBeenCalled();
  });

  test("message in chat only - no kick", async () => {
    const msg = makeMessage({ channelName: "chat", content: TEXT, attachments: [] });
    await firewall(msg, client, models);
    expect(msg.guild.members.ban).not.toHaveBeenCalled();
  });

  test("honeypot then same message in chat - kicks", async () => {
    const authorId = "bot-user-1";
    const hp = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    const chat = makeMessage({ authorId, channelName: "chat", content: TEXT, attachments: [] });
    await firewall(hp, client, models);
    await firewall(chat, client, models);
    expect(chat.guild.members.ban).toHaveBeenCalledTimes(1);
    expect(chat.guild.members.unban).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(UNBAN_DELAY_MS);
    expect(chat.guild.members.unban).toHaveBeenCalledTimes(1);
    expect(sendReportToCommandsChannel).toHaveBeenCalledWith(client, expect.stringContaining("HONEYPOT TRIGGERED"));
    const [dm] = chat.author.send.mock.calls[0];
    expect(dm).toContain("was also posted in a channel meant to catch spam bots");
    expect(dm).toContain("You were kicked");
  });

  test("unban is skipped when ban fails", async () => {
    const authorId = "bot-user-ban-fail";
    const hp = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    const chat = makeMessage({ authorId, channelName: "chat", content: TEXT, attachments: [] });
    chat.guild.members.ban = jest.fn().mockRejectedValue(new Error("Missing Permissions"));
    await firewall(hp, client, models);
    await firewall(chat, client, models);
    expect(chat.guild.members.ban).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(UNBAN_DELAY_MS);
    expect(chat.guild.members.unban).not.toHaveBeenCalled();
  });

  test("chat then same message in honeypot - kicks", async () => {
    const authorId = "bot-user-2";
    const chat = makeMessage({ authorId, channelName: "chat", content: TEXT, attachments: [] });
    const hp = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    await firewall(chat, client, models);
    await firewall(hp, client, models);
    expect(hp.guild.members.ban).toHaveBeenCalledTimes(1);
    expect(hp.guild.members.unban).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(UNBAN_DELAY_MS);
    expect(hp.guild.members.unban).toHaveBeenCalledTimes(1);
  });

  test("different content in honeypot vs chat - no kick", async () => {
    const authorId = "bot-user-3";
    const hp = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "trap message", attachments: [] });
    const chat = makeMessage({ authorId, channelName: "chat", content: "different message", attachments: [] });
    await firewall(hp, client, models);
    await firewall(chat, client, models);
    expect(chat.guild.members.ban).not.toHaveBeenCalled();
  });

  test("honeypot message is always deleted", async () => {
    const msg = makeMessage({ channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    await firewall(msg, client, models);
    expect(msg.delete).toHaveBeenCalledTimes(1);
  });

  test("chat message is not deleted", async () => {
    const msg = makeMessage({ channelName: "chat", content: TEXT, attachments: [] });
    await firewall(msg, client, models);
    expect(msg.delete).not.toHaveBeenCalled();
  });

  test("different users with same content are not cross-matched", async () => {
    const hp = makeMessage({ authorId: "user-x", channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    const chat = makeMessage({ authorId: "user-y", channelName: "chat", content: TEXT, attachments: [] });
    await firewall(hp, client, models);
    await firewall(chat, client, models);
    expect(chat.guild.members.ban).not.toHaveBeenCalled();
  });

  test("attachment-only message in honeypot is deleted", async () => {
    const att = [
      { name: "spam.png", size: 5000, contentType: "image/png", width: 100, height: 100, url: "http://example.com/s" }
    ];
    const msg = makeMessage({ channelName: HONEYPOT_CHANNEL_NAME, content: "", attachments: att });
    await firewall(msg, client, models);
    expect(msg.delete).toHaveBeenCalledTimes(1);
  });

  test("same attachments in honeypot then chat - kicks", async () => {
    const authorId = "att-bot-1";
    const att = [
      { name: "spam.png", size: 5000, contentType: "image/png", width: 100, height: 100, url: "http://example.com/s" }
    ];
    const hp = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "", attachments: att });
    const chat = makeMessage({ authorId, channelName: "chat", content: "", attachments: att });
    await firewall(hp, client, models);
    await firewall(chat, client, models);
    expect(chat.guild.members.ban).toHaveBeenCalledTimes(1);
    expect(chat.guild.members.unban).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(UNBAN_DELAY_MS);
    expect(chat.guild.members.unban).toHaveBeenCalledTimes(1);
  });

  test("same attachments in chat then honeypot - kicks", async () => {
    const authorId = "att-bot-2";
    const att = [
      { name: "scam.jpg", size: 8000, contentType: "image/jpeg", width: 200, height: 200, url: "http://example.com/sc" }
    ];
    const chat = makeMessage({ authorId, channelName: "chat", content: "", attachments: att });
    const hp = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "", attachments: att });
    await firewall(chat, client, models);
    await firewall(hp, client, models);
    expect(hp.guild.members.ban).toHaveBeenCalledTimes(1);
  });

  test("different attachments in honeypot vs chat - no kick", async () => {
    const authorId = "att-bot-3";
    const att1 = [
      { name: "a.png", size: 1000, contentType: "image/png", width: 50, height: 50, url: "http://example.com/a" }
    ];
    const att2 = [
      { name: "b.png", size: 2000, contentType: "image/png", width: 60, height: 60, url: "http://example.com/b" }
    ];
    const hp = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "", attachments: att1 });
    const chat = makeMessage({ authorId, channelName: "chat", content: "", attachments: att2 });
    await firewall(hp, client, models);
    await firewall(chat, client, models);
    expect(chat.guild.members.ban).not.toHaveBeenCalled();
  });

  test("first honeypot message from a user does not trigger a ban", async () => {
    const msg = makeMessage({ channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    await firewall(msg, client, models);
    expect(msg.guild.members.ban).not.toHaveBeenCalled();
  });

  test("second honeypot message from the same user triggers a ban+unban", async () => {
    const authorId = "repeat-poster-1";
    const msg1 = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    const msg2 = makeMessage({
      authorId,
      channelName: HONEYPOT_CHANNEL_NAME,
      content: "different content",
      attachments: []
    });
    await firewall(msg1, client, models);
    await firewall(msg2, client, models);
    expect(msg2.guild.members.ban).toHaveBeenCalledTimes(1);
    expect(msg2.guild.members.unban).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(UNBAN_DELAY_MS);
    expect(msg2.guild.members.unban).toHaveBeenCalledTimes(1);
  });

  test("repeat honeypot poster receives a message about the honeypot channel", async () => {
    const authorId = "repeat-poster-2";
    const msg1 = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    const msg2 = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "other", attachments: [] });
    await firewall(msg1, client, models);
    await firewall(msg2, client, models);
    expect(msg2.author.send).toHaveBeenCalledTimes(1);
    const dmContent = msg2.author.send.mock.calls[0][0];
    expect(dmContent).toContain("honeypot");
  });

  test("repeat honeypot trigger is reported to commands channel", async () => {
    const authorId = "repeat-poster-3";
    const msg1 = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    const msg2 = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "other", attachments: [] });
    await firewall(msg1, client, models);
    await firewall(msg2, client, models);
    expect(sendReportToCommandsChannel).toHaveBeenCalledWith(
      client,
      expect.stringContaining("HONEYPOT REPEAT MESSAGE KICK")
    );
  });

  test("honeypot message report includes the message content", async () => {
    const msg = makeMessage({ channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    await firewall(msg, client, models);
    expect(sendReportToCommandsChannel).toHaveBeenCalledWith(client, expect.stringContaining(TEXT));
  });

  test("honeypot message report shows placeholder when there is no text content", async () => {
    const att = [
      { name: "spam.png", size: 5000, contentType: "image/png", width: 100, height: 100, url: "http://example.com/s" }
    ];
    const msg = makeMessage({ channelName: HONEYPOT_CHANNEL_NAME, content: "", attachments: att });
    await firewall(msg, client, models);
    const [, content] = sendReportToCommandsChannel.mock.calls[0];
    expect(content).toContain("Message: *(no text content)*");
  });

  test("honeypot message report uploads attachments and lists them like scam reports", async () => {
    const att = [
      { name: "spam.png", size: 5000, contentType: "image/png", width: 100, height: 100, url: "http://example.com/s" },
      { name: "notes.txt", size: 20, contentType: "text/plain", width: null, height: null, url: "http://example.com/t" }
    ];
    const msg = makeMessage({ channelName: HONEYPOT_CHANNEL_NAME, content: "", attachments: att });
    await firewall(msg, client, models);
    const [, content, files] = sendReportToCommandsChannel.mock.calls[0];
    expect(files).toEqual(["http://example.com/s", "http://example.com/t"]);
    expect(content).toContain("Count: 2\n• spam.png | image/png | 5000B | 100x100\n• notes.txt | text/plain | 20B");
    expect(content).not.toContain("http://example.com/s");
  });

  test("honeypot report is sent before the honeypot channel is cleaned", async () => {
    const msg = makeMessage({ channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    const order = [];
    sendReportToCommandsChannel.mockImplementationOnce(async () => order.push("report"));
    msg.channel.messages.fetch.mockImplementationOnce(async () => {
      order.push("clean");
      return makeCollection([]);
    });
    await firewall(msg, client, models);
    expect(order).toEqual(["report", "clean"]);
  });

  test("honeypot report falls back to links when the upload fails", async () => {
    const att = [
      { name: "big.png", size: 9e7, contentType: "image/png", width: 100, height: 100, url: "http://example.com/b" }
    ];
    const msg = makeMessage({ channelName: HONEYPOT_CHANNEL_NAME, content: "", attachments: att });
    sendReportToCommandsChannel.mockRejectedValueOnce(new Error("Request entity too large"));
    await firewall(msg, client, models);
    const [, fallbackContent, fallbackFiles] = sendReportToCommandsChannel.mock.calls[1];
    expect(fallbackContent).toContain("http://example.com/b");
    expect(fallbackFiles).toBeUndefined();
  });

  test("honeypot message report has no attachment list when there are none", async () => {
    const msg = makeMessage({ channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    await firewall(msg, client, models);
    const [, content] = sendReportToCommandsChannel.mock.calls[0];
    expect(content).not.toContain("Count:");
  });

  test("repeat honeypot trigger report does not include the message content", async () => {
    const authorId = "repeat-poster-4";
    const msg1 = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    const msg2 = makeMessage({
      authorId,
      channelName: HONEYPOT_CHANNEL_NAME,
      content: "other content",
      attachments: []
    });
    await firewall(msg1, client, models);
    await firewall(msg2, client, models);
    const triggeredCall = sendReportToCommandsChannel.mock.calls.find(([, content]) =>
      content.includes("HONEYPOT REPEAT MESSAGE KICK")
    );
    expect(triggeredCall[1]).not.toContain("Message:");
  });

  test("different users posting in honeypot do not trigger each other's ban", async () => {
    const msg1 = makeMessage({
      authorId: "user-hp-a",
      channelName: HONEYPOT_CHANNEL_NAME,
      content: TEXT,
      attachments: []
    });
    const msg2 = makeMessage({
      authorId: "user-hp-b",
      channelName: HONEYPOT_CHANNEL_NAME,
      content: TEXT,
      attachments: []
    });
    await firewall(msg1, client, models);
    await firewall(msg2, client, models);
    expect(msg1.guild.members.ban).not.toHaveBeenCalled();
    expect(msg2.guild.members.ban).not.toHaveBeenCalled();
  });

  test("accumulated non-pinned messages are bulk deleted when a new honeypot message arrives", async () => {
    const stale1 = { pinned: false, createdTimestamp: Date.now(), delete: jest.fn().mockResolvedValue() };
    const stale2 = { pinned: false, createdTimestamp: Date.now(), delete: jest.fn().mockResolvedValue() };
    const msg = makeMessage({
      channelName: HONEYPOT_CHANNEL_NAME,
      content: TEXT,
      attachments: [],
      extraChannelMessages: [stale1, stale2]
    });
    await firewall(msg, client, models);
    expect(msg.channel.bulkDelete).toHaveBeenCalledTimes(1);
  });

  test("pinned honeypot warning message is not deleted during channel cleanup", async () => {
    const pinnedMsg = { pinned: true, createdTimestamp: Date.now(), delete: jest.fn().mockResolvedValue() };
    const msg = makeMessage({
      channelName: HONEYPOT_CHANNEL_NAME,
      content: TEXT,
      attachments: [],
      extraChannelMessages: [pinnedMsg]
    });
    await firewall(msg, client, models);
    expect(pinnedMsg.delete).not.toHaveBeenCalled();
  });

  test("messages older than 14 days in honeypot are deleted individually", async () => {
    const oldTimestamp = Date.now() - 15 * 24 * 60 * 60 * 1000;
    const oldMsg = { pinned: false, createdTimestamp: oldTimestamp, delete: jest.fn().mockResolvedValue() };
    const msg = makeMessage({
      channelName: HONEYPOT_CHANNEL_NAME,
      content: TEXT,
      attachments: [],
      extraChannelMessages: [oldMsg]
    });
    await firewall(msg, client, models);
    expect(oldMsg.delete).toHaveBeenCalledTimes(1);
    expect(msg.channel.bulkDelete).not.toHaveBeenCalled();
  });
});

describe("honeypot poster expiry", () => {
  const TTL_MS = 60 * 60 * 1000;
  const postHoneypot = (authorId, content) =>
    firewall(makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content, attachments: [] }), client, models);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("second honeypot post just under an hour later still triggers a ban+unban", async () => {
    const authorId = "expiry-within";
    await postHoneypot(authorId, "first");

    jest.setSystemTime(Date.now() + TTL_MS - 1000);
    const second = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "second", attachments: [] });
    await firewall(second, client, models);

    expect(second.guild.members.ban).toHaveBeenCalledTimes(1);
    expect(second.guild.members.unban).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(UNBAN_DELAY_MS);
    expect(second.guild.members.unban).toHaveBeenCalledTimes(1);
  });

  test("second honeypot post more than an hour later is treated as a first post (no ban)", async () => {
    const authorId = "expiry-after";
    await postHoneypot(authorId, "first");

    jest.setSystemTime(Date.now() + TTL_MS + 1000);
    const second = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "second", attachments: [] });
    await firewall(second, client, models);

    expect(second.guild.members.ban).not.toHaveBeenCalled();
  });

  test("once the entry has expired, a fresh pair of posts within an hour bans again", async () => {
    const authorId = "expiry-rearm";
    await postHoneypot(authorId, "first");

    jest.setSystemTime(Date.now() + TTL_MS + 1000);
    const rearm = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "rearm", attachments: [] });
    await firewall(rearm, client, models);
    expect(rearm.guild.members.ban).not.toHaveBeenCalled();

    jest.setSystemTime(Date.now() + 60 * 1000);
    const third = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "third", attachments: [] });
    await firewall(third, client, models);
    expect(third.guild.members.ban).toHaveBeenCalledTimes(1);
  });
});

describe("possible scam report delay", () => {
  const possibleScamReports = () =>
    sendReportToCommandsChannel.mock.calls.filter(([, content]) => content.includes("POSSIBLE SCAM IMAGES DETECTED"));

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("is not sent before a minute has passed", async () => {
    await firewall(makeMessage({ attachments: SUSPICIOUS_IMAGES }), client, models);
    await jest.advanceTimersByTimeAsync(REPORT_DELAY_MS - 1);
    expect(possibleScamReports()).toHaveLength(0);
    await jest.advanceTimersByTimeAsync(1);
    expect(possibleScamReports()).toHaveLength(1);
  });

  test("is not sent when the same images also land in the honeypot", async () => {
    const authorId = "scam-then-honeypot";
    await firewall(makeMessage({ authorId, attachments: SUSPICIOUS_IMAGES }), client, models);
    await firewall(
      makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, attachments: SUSPICIOUS_IMAGES }),
      client,
      models
    );
    await jest.advanceTimersByTimeAsync(REPORT_DELAY_MS);
    expect(possibleScamReports()).toHaveLength(0);
    expect(sendReportToCommandsChannel.mock.calls.some(([, content]) => content.includes("HONEYPOT TRIGGERED"))).toBe(
      true
    );
  });

  test("is not sent when the user is kicked for posting twice in the honeypot", async () => {
    const authorId = "scam-then-honeypot-twice";
    const postHoneypot = (content) =>
      firewall(makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content, attachments: [] }), client, models);
    await firewall(makeMessage({ authorId, attachments: SUSPICIOUS_IMAGES }), client, models);
    await postHoneypot("first");
    await postHoneypot("second");
    await jest.advanceTimersByTimeAsync(REPORT_DELAY_MS);
    expect(possibleScamReports()).toHaveLength(0);
  });

  test("is still sent when the user only posts once in the honeypot without being kicked", async () => {
    const authorId = "scam-and-single-honeypot";
    await firewall(makeMessage({ authorId, attachments: SUSPICIOUS_IMAGES }), client, models);
    await firewall(
      makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "hello", attachments: [] }),
      client,
      models
    );
    await jest.advanceTimersByTimeAsync(REPORT_DELAY_MS);
    expect(possibleScamReports()).toHaveLength(1);
  });

  test("several suspicious messages from one user give one report", async () => {
    const authorId = "many-suspicious";
    await firewall(makeMessage({ authorId, attachments: SUSPICIOUS_IMAGES }), client, models);
    await firewall(makeMessage({ authorId, attachments: SUSPICIOUS_IMAGES }), client, models);
    await jest.advanceTimersByTimeAsync(REPORT_DELAY_MS);
    expect(possibleScamReports()).toHaveLength(1);
  });
});

describe("known scam image matching", () => {
  const THREE_IMAGES = SUSPICIOUS_IMAGES.slice(0, 3);

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("removes the message and kicks when every image matches a known scam image", async () => {
    matchScamImages.mockResolvedValueOnce(hashMatch(3, 3));
    const msg = makeMessage({ attachments: THREE_IMAGES });
    await firewall(msg, client, models);
    expect(msg.delete).toHaveBeenCalledTimes(1);
    expect(msg.guild.members.ban).toHaveBeenCalledTimes(1);
    const [, content] = sendReportToCommandsChannel.mock.calls[0];
    expect(content).toContain("SCAM MESSAGE DETECTED AND REMOVED");
    expect(content).toContain("Known scam image matches: 3/3 (story)");
    const [dm] = msg.author.send.mock.calls[0];
    expect(dm).toContain("matched a known scam");
    expect(dm).toContain("reset your Discord password");
    expect(dm).toContain("every device you use Discord on");
    expect(dm).toContain("You were kicked");
  });

  test("holds a possible scam report when only some images match", async () => {
    matchScamImages.mockResolvedValueOnce(hashMatch(2, 3));
    const msg = makeMessage({ attachments: THREE_IMAGES });
    await firewall(msg, client, models);
    expect(msg.delete).not.toHaveBeenCalled();
    expect(sendReportToCommandsChannel).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(REPORT_DELAY_MS);
    const [, content] = sendReportToCommandsChannel.mock.calls[0];
    expect(content).toContain("POSSIBLE SCAM IMAGES DETECTED");
    expect(content).toContain("Known scam image matches: 2/3 (story)");
  });

  test("does nothing for images that match nothing", async () => {
    const msg = makeMessage({ attachments: THREE_IMAGES });
    await firewall(msg, client, models);
    await jest.advanceTimersByTimeAsync(REPORT_DELAY_MS);
    expect(msg.delete).not.toHaveBeenCalled();
    expect(sendReportToCommandsChannel).not.toHaveBeenCalled();
  });

  test("does not check a single image", async () => {
    await firewall(makeMessage({ attachments: THREE_IMAGES.slice(0, 1) }), client, models);
    expect(matchScamImages).not.toHaveBeenCalled();
  });

  test.each([["faculty"], ["admin"], ["tira instructor"]])(
    "removes a known scam from a member with the %s role, pings the admins and warns the member without kicking",
    async (roleName) => {
      const msg = makeMessage({ roleNames: [roleName] });
      await firewall(msg, client, models);
      expect(msg.delete).toHaveBeenCalledTimes(1);
      expect(msg.guild.members.ban).not.toHaveBeenCalled();
      expect(sendReportToCommandsChannel).toHaveBeenCalledTimes(1);
      const [, content] = sendReportToCommandsChannel.mock.calls[0];
      expect(content).toContain("<@&758046962829361262>");
      expect(content).toContain("SCAM MESSAGE FROM A STAFF ACCOUNT REMOVED");
      expect(content).toContain("the member has a staff role");
      expect(content).not.toContain(msg.url);
      expect(msg.author.send).toHaveBeenCalledTimes(1);
      const [dm] = msg.author.send.mock.calls[0];
      expect(dm).toContain("reset your Discord password");
      expect(dm).toContain("you were not kicked");
      expect(dm).not.toContain("Malwarebytes");
      expect(dm).not.toContain("You were kicked");
      await jest.advanceTimersByTimeAsync(REPORT_DELAY_MS);
      expect(sendReportToCommandsChannel).toHaveBeenCalledTimes(1);
    }
  );
});

describe("persisted unbans", () => {
  const TEXT = "free nitro click here";
  const kickViaHoneypot = async (authorId) => {
    await firewall(
      makeMessage({
        authorId,
        channelName: HONEYPOT_CHANNEL_NAME,
        content: TEXT,
        attachments: []
      }),
      client,
      models
    );
    const chat = makeMessage({
      authorId,
      channelName: "chat",
      content: TEXT,
      attachments: []
    });
    await firewall(chat, client, models);
    return chat;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("a ban stores a pending unban due a minute later", async () => {
    await kickViaHoneypot("persist-1");
    expect(addPendingUnban).toHaveBeenCalledWith(
      "persist-1",
      new Date(Date.now() + UNBAN_DELAY_MS),
      models.PendingUnban
    );
  });

  test("the pending unban is removed once the unban succeeds", async () => {
    const chat = await kickViaHoneypot("persist-2");
    expect(removePendingUnban).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(UNBAN_DELAY_MS);
    expect(chat.guild.members.unban).toHaveBeenCalledWith("persist-2");
    expect(removePendingUnban).toHaveBeenCalledWith("pending-persist-2", models.PendingUnban);
  });

  test("the pending unban is kept when the unban fails", async () => {
    const authorId = "persist-3";
    await firewall(
      makeMessage({
        authorId,
        channelName: HONEYPOT_CHANNEL_NAME,
        content: TEXT,
        attachments: []
      }),
      client,
      models
    );
    const chat = makeMessage({
      authorId,
      channelName: "chat",
      content: TEXT,
      attachments: []
    });
    chat.guild.members.unban.mockRejectedValue(new Error("Service Unavailable"));
    await firewall(chat, client, models);
    await jest.advanceTimersByTimeAsync(UNBAN_DELAY_MS);
    expect(removePendingUnban).not.toHaveBeenCalled();
  });

  test("the pending unban is removed when the member was already unbanned", async () => {
    const authorId = "persist-4";
    await firewall(
      makeMessage({
        authorId,
        channelName: HONEYPOT_CHANNEL_NAME,
        content: TEXT,
        attachments: []
      }),
      client,
      models
    );
    const chat = makeMessage({
      authorId,
      channelName: "chat",
      content: TEXT,
      attachments: []
    });
    chat.guild.members.unban.mockRejectedValue(
      Object.assign(new Error("Unknown Ban"), {
        code: RESTJSONErrorCodes.UnknownBan
      })
    );
    await firewall(chat, client, models);
    await jest.advanceTimersByTimeAsync(UNBAN_DELAY_MS);
    expect(removePendingUnban).toHaveBeenCalledWith("pending-persist-4", models.PendingUnban);
  });

  test("the member is still unbanned when storing the pending unban fails", async () => {
    addPendingUnban.mockRejectedValueOnce(new Error("connection lost"));
    const chat = await kickViaHoneypot("persist-5");
    await jest.advanceTimersByTimeAsync(UNBAN_DELAY_MS);
    expect(chat.guild.members.unban).toHaveBeenCalledWith("persist-5");
    expect(removePendingUnban).not.toHaveBeenCalled();
  });

  test("on startup overdue unbans run at once and future ones wait until due", async () => {
    const guild = { members: { unban: jest.fn().mockResolvedValue() } };
    listPendingUnbans.mockResolvedValueOnce([
      { id: 1, discordId: "overdue", unbanAt: new Date(Date.now() - 1000) },
      {
        id: 2,
        discordId: "upcoming",
        unbanAt: new Date(Date.now() + 30 * 1000)
      }
    ]);
    await resumePendingUnbans(guild, models);
    await jest.advanceTimersByTimeAsync(0);
    expect(guild.members.unban).toHaveBeenCalledTimes(1);
    expect(guild.members.unban).toHaveBeenCalledWith("overdue");
    expect(removePendingUnban).toHaveBeenCalledWith(1, models.PendingUnban);
    await jest.advanceTimersByTimeAsync(30 * 1000);
    expect(guild.members.unban).toHaveBeenCalledWith("upcoming");
    expect(removePendingUnban).toHaveBeenCalledWith(2, models.PendingUnban);
  });
});

const { firewall, resetHoneypotState } = require("../../src/discordBot/services/firewall");
const { HONEYPOT_CHANNEL_NAME } = require("../../src/discordBot/services/honeypot");
const { sendReportToCommandsChannel } = require("../../src/discordBot/services/message");

jest.mock("../../src/discordBot/services/message");
jest.mock("../../src/discordBot/services/logger", () => ({ logError: jest.fn() }));

const SCAM_IMAGES = [
  { contentType: "image/jpeg", name: "img1.jpg", size: 1000, width: 1920, height: 2560, url: "http://example.com/1" },
  { contentType: "image/jpeg", name: "img2.jpg", size: 1000, width: 1920, height: 2560, url: "http://example.com/2" },
  { contentType: "image/jpeg", name: "img3.jpg", size: 1000, width: 1920, height: 2560, url: "http://example.com/3" },
  { contentType: "image/png", name: "img4.png", size: 500, width: 828, height: 1012, url: "http://example.com/4" },
];

const makeAttachments = (allAttachments) => ({
  filter: jest.fn((fn) => {
    const filtered = allAttachments.filter(fn);
    return {
      size: filtered.length,
      map: (mapFn) => filtered.map(mapFn),
    };
  }),
  size: allAttachments.length,
  values: () => allAttachments[Symbol.iterator](),
});

const makeCollection = (items = []) => {
  const arr = [...items];
  return {
    filter: (fn) => makeCollection(arr.filter(fn)),
    size: arr.length,
    first: () => arr[0],
    values: () => arr[Symbol.iterator](),
  };
};

let authorCounter = 0;
const makeMessage = ({ isBot = false, hasMember = true, attachments = SCAM_IMAGES, authorId, channelName = "chat", content = "", pinned = false, extraChannelMessages = [] } = {}) => {
  const id = authorId ?? `user-${++authorCounter}`;
  const msg = {
    author: { bot: isBot, id, tag: "user#0001", send: jest.fn().mockResolvedValue() },
    member: hasMember ? { displayName: "Test User", kick: jest.fn().mockResolvedValue() } : null,
    guild: {
      members: { ban: jest.fn().mockResolvedValue({ id }), unban: jest.fn().mockResolvedValue() },
    },
    url: "https://discord.com/channels/guild/channel-123/msg-456",
    attachments: makeAttachments(attachments),
    content,
    delete: jest.fn().mockResolvedValue(),
    pinned,
    createdTimestamp: Date.now(),
  };
  msg.channel = {
    id: "channel-123",
    name: channelName,
    messages: {
      fetch: jest.fn().mockResolvedValue(makeCollection([msg, ...extraChannelMessages])),
    },
    bulkDelete: jest.fn().mockResolvedValue(),
  };
  return msg;
};

const client = {};

afterEach(() => {
  jest.clearAllMocks();
  resetHoneypotState();
});

describe("firewall", () => {
  test("ignores bot messages", async () => {
    const msg = makeMessage({ isBot: true });
    await firewall(msg, client);
    expect(msg.attachments.filter).not.toHaveBeenCalled();
    expect(sendReportToCommandsChannel).not.toHaveBeenCalled();
  });

  test("ignores messages without a guild member", async () => {
    const msg = makeMessage({ hasMember: false });
    await firewall(msg, client);
    expect(msg.attachments.filter).not.toHaveBeenCalled();
    expect(sendReportToCommandsChannel).not.toHaveBeenCalled();
  });

  test("does nothing for messages with fewer than 4 images", async () => {
    const msg = makeMessage({ attachments: SCAM_IMAGES.slice(0, 3) });
    await firewall(msg, client);
    expect(msg.delete).not.toHaveBeenCalled();
    expect(sendReportToCommandsChannel).not.toHaveBeenCalled();
  });

  test("does nothing for messages with more than 4 images", async () => {
    const extra = { contentType: "image/jpeg", name: "extra.jpg", size: 100, width: 100, height: 100, url: "http://example.com/5" };
    const msg = makeMessage({ attachments: [...SCAM_IMAGES, extra] });
    await firewall(msg, client);
    expect(msg.delete).not.toHaveBeenCalled();
    expect(sendReportToCommandsChannel).not.toHaveBeenCalled();
  });

  test("does nothing when 4 attachments are not images", async () => {
    const nonImages = [
      { contentType: "application/pdf", name: "a.pdf", size: 100 },
      { contentType: "application/pdf", name: "b.pdf", size: 100 },
      { contentType: "text/plain", name: "c.txt", size: 100 },
      { contentType: "text/plain", name: "d.txt", size: 100 },
    ];
    const msg = makeMessage({ attachments: nonImages });
    await firewall(msg, client);
    expect(msg.delete).not.toHaveBeenCalled();
    expect(sendReportToCommandsChannel).not.toHaveBeenCalled();
  });

  test("reports 4 images that do not match a known scam fingerprint", async () => {
    const suspiciousImages = [
      { contentType: "image/jpeg", name: "a.jpg", size: 100, width: 100, height: 200, url: "http://example.com/a" },
      { contentType: "image/jpeg", name: "b.jpg", size: 100, width: 300, height: 400, url: "http://example.com/b" },
      { contentType: "image/jpeg", name: "c.jpg", size: 100, width: 500, height: 600, url: "http://example.com/c" },
      { contentType: "image/jpeg", name: "d.jpg", size: 100, width: 700, height: 800, url: "http://example.com/d" },
    ];
    const msg = makeMessage({ attachments: suspiciousImages });
    await firewall(msg, client);
    expect(msg.delete).not.toHaveBeenCalled();
    expect(sendReportToCommandsChannel).toHaveBeenCalledTimes(1);
    const [, content] = sendReportToCommandsChannel.mock.calls[0];
    expect(content).toContain("POSSIBLE SCAM IMAGES DETECTED");
  });

  test("deletes message, DMs user, bans+unbans member, and reports when scam fingerprint matches", async () => {
    const msg = makeMessage();
    await firewall(msg, client);
    expect(msg.delete).toHaveBeenCalledTimes(1);
    expect(msg.author.send).toHaveBeenCalledTimes(1);
    expect(msg.guild.members.ban).toHaveBeenCalledTimes(1);
    expect(msg.guild.members.unban).toHaveBeenCalledTimes(1);
    expect(sendReportToCommandsChannel).toHaveBeenCalledTimes(1);
    const [, content] = sendReportToCommandsChannel.mock.calls[0];
    expect(content).toContain("SCAM MESSAGE DETECTED AND REMOVED");
  });

  test("report includes member mention, channel link, and image count", async () => {
    const msg = makeMessage();
    await firewall(msg, client);
    const [, content] = sendReportToCommandsChannel.mock.calls[0];
    expect(content).toContain(`<@${msg.author.id}>`);
    expect(content).toContain("<#channel-123>");
    expect(content).toContain("Count: 4");
  });

  test("possible scam report includes message link", async () => {
    const suspiciousImages = [
      { contentType: "image/jpeg", name: "a.jpg", size: 100, width: 100, height: 200, url: "http://example.com/a" },
      { contentType: "image/jpeg", name: "b.jpg", size: 100, width: 300, height: 400, url: "http://example.com/b" },
      { contentType: "image/jpeg", name: "c.jpg", size: 100, width: 500, height: 600, url: "http://example.com/c" },
      { contentType: "image/jpeg", name: "d.jpg", size: 100, width: 700, height: 800, url: "http://example.com/d" },
    ];
    const msg = makeMessage({ attachments: suspiciousImages });
    await firewall(msg, client);
    const [, content] = sendReportToCommandsChannel.mock.calls[0];
    expect(content).toContain(msg.url);
  });

  test("confirmed scam report does not include message link", async () => {
    const msg = makeMessage();
    await firewall(msg, client);
    const [, content] = sendReportToCommandsChannel.mock.calls[0];
    expect(content).not.toContain(msg.url);
  });

  test("report passes image URLs as files", async () => {
    const msg = makeMessage();
    await firewall(msg, client);
    const [, , files] = sendReportToCommandsChannel.mock.calls[0];
    expect(files).toHaveLength(4);
    expect(files).toContain("http://example.com/1");
  });

  test("cooldown prevents duplicate reports from the same user within 2 minutes", async () => {
    const authorId = "cooldown-test-user";
    const msg1 = makeMessage({ authorId });
    const msg2 = makeMessage({ authorId });
    await firewall(msg1, client);
    await firewall(msg2, client);
    expect(sendReportToCommandsChannel).toHaveBeenCalledTimes(1);
  });

  test("different users are each reported independently", async () => {
    const msg1 = makeMessage({ authorId: "user-a" });
    const msg2 = makeMessage({ authorId: "user-b" });
    await firewall(msg1, client);
    await firewall(msg2, client);
    expect(sendReportToCommandsChannel).toHaveBeenCalledTimes(2);
  });
});

describe("honeypot detection", () => {
  const TEXT = "free nitro click here";

  test("message in honeypot only - no kick", async () => {
    const msg = makeMessage({ channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    await firewall(msg, client);
    expect(msg.guild.members.ban).not.toHaveBeenCalled();
  });

  test("message in chat only - no kick", async () => {
    const msg = makeMessage({ channelName: "chat", content: TEXT, attachments: [] });
    await firewall(msg, client);
    expect(msg.guild.members.ban).not.toHaveBeenCalled();
  });

  test("honeypot then same message in chat - kicks", async () => {
    const authorId = "bot-user-1";
    const hp = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    const chat = makeMessage({ authorId, channelName: "chat", content: TEXT, attachments: [] });
    await firewall(hp, client);
    await firewall(chat, client);
    expect(chat.guild.members.ban).toHaveBeenCalledTimes(1);
    expect(chat.guild.members.unban).toHaveBeenCalledTimes(1);
    expect(sendReportToCommandsChannel).toHaveBeenCalledWith(client, expect.stringContaining("HONEYPOT TRIGGERED"));
  });

  test("unban is skipped when ban fails", async () => {
    const authorId = "bot-user-ban-fail";
    const hp = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    const chat = makeMessage({ authorId, channelName: "chat", content: TEXT, attachments: [] });
    chat.guild.members.ban = jest.fn().mockRejectedValue(new Error("Missing Permissions"));
    await firewall(hp, client);
    await firewall(chat, client);
    expect(chat.guild.members.ban).toHaveBeenCalledTimes(1);
    expect(chat.guild.members.unban).not.toHaveBeenCalled();
  });

  test("chat then same message in honeypot - kicks", async () => {
    const authorId = "bot-user-2";
    const chat = makeMessage({ authorId, channelName: "chat", content: TEXT, attachments: [] });
    const hp = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    await firewall(chat, client);
    await firewall(hp, client);
    expect(hp.guild.members.ban).toHaveBeenCalledTimes(1);
    expect(hp.guild.members.unban).toHaveBeenCalledTimes(1);
  });

  test("different content in honeypot vs chat - no kick", async () => {
    const authorId = "bot-user-3";
    const hp = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "trap message", attachments: [] });
    const chat = makeMessage({ authorId, channelName: "chat", content: "different message", attachments: [] });
    await firewall(hp, client);
    await firewall(chat, client);
    expect(chat.guild.members.ban).not.toHaveBeenCalled();
  });

  test("honeypot message is always deleted", async () => {
    const msg = makeMessage({ channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    await firewall(msg, client);
    expect(msg.delete).toHaveBeenCalledTimes(1);
  });

  test("chat message is not deleted", async () => {
    const msg = makeMessage({ channelName: "chat", content: TEXT, attachments: [] });
    await firewall(msg, client);
    expect(msg.delete).not.toHaveBeenCalled();
  });

  test("different users with same content are not cross-matched", async () => {
    const hp = makeMessage({ authorId: "user-x", channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    const chat = makeMessage({ authorId: "user-y", channelName: "chat", content: TEXT, attachments: [] });
    await firewall(hp, client);
    await firewall(chat, client);
    expect(chat.guild.members.ban).not.toHaveBeenCalled();
  });

  test("attachment-only message in honeypot is deleted", async () => {
    const att = [{ name: "spam.png", size: 5000, contentType: "image/png", width: 100, height: 100, url: "http://example.com/s" }];
    const msg = makeMessage({ channelName: HONEYPOT_CHANNEL_NAME, content: "", attachments: att });
    await firewall(msg, client);
    expect(msg.delete).toHaveBeenCalledTimes(1);
  });

  test("same attachments in honeypot then chat - kicks", async () => {
    const authorId = "att-bot-1";
    const att = [{ name: "spam.png", size: 5000, contentType: "image/png", width: 100, height: 100, url: "http://example.com/s" }];
    const hp = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "", attachments: att });
    const chat = makeMessage({ authorId, channelName: "chat", content: "", attachments: att });
    await firewall(hp, client);
    await firewall(chat, client);
    expect(chat.guild.members.ban).toHaveBeenCalledTimes(1);
    expect(chat.guild.members.unban).toHaveBeenCalledTimes(1);
  });

  test("same attachments in chat then honeypot - kicks", async () => {
    const authorId = "att-bot-2";
    const att = [{ name: "scam.jpg", size: 8000, contentType: "image/jpeg", width: 200, height: 200, url: "http://example.com/sc" }];
    const chat = makeMessage({ authorId, channelName: "chat", content: "", attachments: att });
    const hp = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "", attachments: att });
    await firewall(chat, client);
    await firewall(hp, client);
    expect(hp.guild.members.ban).toHaveBeenCalledTimes(1);
  });

  test("different attachments in honeypot vs chat - no kick", async () => {
    const authorId = "att-bot-3";
    const att1 = [{ name: "a.png", size: 1000, contentType: "image/png", width: 50, height: 50, url: "http://example.com/a" }];
    const att2 = [{ name: "b.png", size: 2000, contentType: "image/png", width: 60, height: 60, url: "http://example.com/b" }];
    const hp = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "", attachments: att1 });
    const chat = makeMessage({ authorId, channelName: "chat", content: "", attachments: att2 });
    await firewall(hp, client);
    await firewall(chat, client);
    expect(chat.guild.members.ban).not.toHaveBeenCalled();
  });

  test("first honeypot message from a user does not trigger a ban", async () => {
    const msg = makeMessage({ channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    await firewall(msg, client);
    expect(msg.guild.members.ban).not.toHaveBeenCalled();
  });

  test("second honeypot message from the same user triggers a ban+unban", async () => {
    const authorId = "repeat-poster-1";
    const msg1 = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    const msg2 = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "different content", attachments: [] });
    await firewall(msg1, client);
    await firewall(msg2, client);
    expect(msg2.guild.members.ban).toHaveBeenCalledTimes(1);
    expect(msg2.guild.members.unban).toHaveBeenCalledTimes(1);
  });

  test("repeat honeypot poster receives a message about the honeypot channel", async () => {
    const authorId = "repeat-poster-2";
    const msg1 = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    const msg2 = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "other", attachments: [] });
    await firewall(msg1, client);
    await firewall(msg2, client);
    expect(msg2.author.send).toHaveBeenCalledTimes(1);
    const dmContent = msg2.author.send.mock.calls[0][0];
    expect(dmContent).toContain("honeypot");
  });

  test("repeat honeypot trigger is reported to commands channel", async () => {
    const authorId = "repeat-poster-3";
    const msg1 = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    const msg2 = makeMessage({ authorId, channelName: HONEYPOT_CHANNEL_NAME, content: "other", attachments: [] });
    await firewall(msg1, client);
    await firewall(msg2, client);
    expect(sendReportToCommandsChannel).toHaveBeenCalledWith(client, expect.stringContaining("HONEYPOT TRIGGERED"));
  });

  test("different users posting in honeypot do not trigger each other's ban", async () => {
    const msg1 = makeMessage({ authorId: "user-hp-a", channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    const msg2 = makeMessage({ authorId: "user-hp-b", channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [] });
    await firewall(msg1, client);
    await firewall(msg2, client);
    expect(msg1.guild.members.ban).not.toHaveBeenCalled();
    expect(msg2.guild.members.ban).not.toHaveBeenCalled();
  });

  test("accumulated non-pinned messages are bulk deleted when a new honeypot message arrives", async () => {
    const stale1 = { pinned: false, createdTimestamp: Date.now(), delete: jest.fn().mockResolvedValue() };
    const stale2 = { pinned: false, createdTimestamp: Date.now(), delete: jest.fn().mockResolvedValue() };
    const msg = makeMessage({ channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [], extraChannelMessages: [stale1, stale2] });
    await firewall(msg, client);
    expect(msg.channel.bulkDelete).toHaveBeenCalledTimes(1);
  });

  test("pinned honeypot warning message is not deleted during channel cleanup", async () => {
    const pinnedMsg = { pinned: true, createdTimestamp: Date.now(), delete: jest.fn().mockResolvedValue() };
    const msg = makeMessage({ channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [], extraChannelMessages: [pinnedMsg] });
    await firewall(msg, client);
    expect(pinnedMsg.delete).not.toHaveBeenCalled();
  });

  test("messages older than 14 days in honeypot are deleted individually", async () => {
    const oldTimestamp = Date.now() - 15 * 24 * 60 * 60 * 1000;
    const oldMsg = { pinned: false, createdTimestamp: oldTimestamp, delete: jest.fn().mockResolvedValue() };
    const msg = makeMessage({ channelName: HONEYPOT_CHANNEL_NAME, content: TEXT, attachments: [], extraChannelMessages: [oldMsg] });
    await firewall(msg, client);
    expect(oldMsg.delete).toHaveBeenCalledTimes(1);
    expect(msg.channel.bulkDelete).not.toHaveBeenCalled();
  });
});

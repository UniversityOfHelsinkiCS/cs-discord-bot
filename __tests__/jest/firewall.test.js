const { firewall } = require("../../src/discordBot/services/firewall");
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
});

let authorCounter = 0;
const makeMessage = ({ isBot = false, hasMember = true, attachments = SCAM_IMAGES, authorId } = {}) => {
  const id = authorId ?? `user-${++authorCounter}`;
  return {
    author: { bot: isBot, id, tag: "user#0001", send: jest.fn().mockResolvedValue() },
    member: hasMember ? { displayName: "Test User", kick: jest.fn().mockResolvedValue() } : null,
    channel: { id: "channel-123", name: "general" },
    url: "https://discord.com/channels/guild/channel-123/msg-456",
    attachments: makeAttachments(attachments),
    delete: jest.fn(),
  };
};

const client = {};

afterEach(() => {
  jest.clearAllMocks();
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

  test("deletes message, DMs user, kicks member, and reports when scam fingerprint matches", async () => {
    const msg = makeMessage();
    await firewall(msg, client);
    expect(msg.delete).toHaveBeenCalledTimes(1);
    expect(msg.author.send).toHaveBeenCalledTimes(1);
    expect(msg.member.kick).toHaveBeenCalledTimes(1);
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

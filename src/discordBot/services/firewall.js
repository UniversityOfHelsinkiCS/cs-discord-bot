const { sendReportToCommandsChannel } = require("./message");
const { logError } = require("./logger");

const { HONEYPOT_CHANNEL_NAME } = require("./honeypot");
const MONITORED_CHANNEL_NAME = "chat";
const MESSAGE_TTL_MS = 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 10 * 60 * 1000;
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

const honeypotMessages = new Map();
const chatMessages = new Map();
const honeypotPosters = new Set();

const addToStore = (store, userId, content) => {
  if (!store.has(userId)) store.set(userId, new Map());
  store.get(userId).set(content, Date.now());
};

const hasInStore = (store, userId, content) => {
  const userMap = store.get(userId);
  if (!userMap) return false;
  const ts = userMap.get(content);
  if (ts === undefined) return false;
  return Date.now() - ts < MESSAGE_TTL_MS;
};

const pruneStore = (store) => {
  const now = Date.now();
  for (const [userId, contentMap] of store) {
    for (const [content, ts] of contentMap) {
      if (now - ts >= MESSAGE_TTL_MS) contentMap.delete(content);
    }
    if (contentMap.size === 0) store.delete(userId);
  }
};

const startFirewallPruning = () => setInterval(() => {
  pruneStore(honeypotMessages);
  pruneStore(chatMessages);
}, PRUNE_INTERVAL_MS);

const recentlyReported = new Map();
const COOLDOWN_MS = 2 * 60 * 1000;

// This will be moved to the database in the future
const SCAM_FINGERPRINT_SETS = [
  [
    { width: 1920, height: 2560 },
    { width: 1920, height: 2560 },
    { width: 1920, height: 2560 },
    { width: 828, height: 1012 },
  ],
  [
    { width: 2227, height: 2560 },
    { width: 2560, height: 2513 },
    { width: 1839, height: 2560 },
    { width: 2560, height: 2377 },
  ],
  [
    { width: 651, height: 1002 },
    { width: 634, height: 977 },
    { width: 699, height: 1078 },
    { width: 2047, height: 2560 },
  ],
  [
    { width: 1304, height: 1174 },
    { width: 1099, height: 636 },
    { width: 1082, height: 859 },
    { width: 960, height: 1200 },
  ],
  [
    { width: 960, height: 1280 },
    { width: 960, height: 1280 },
    { width: 960, height: 1280 },
    { width: 946, height: 1261 },
  ],
];

const buildHoneypotRepeatMessage = () => `Hey!

You have sent multiple messages in our honeypot channel. This channel is a trap designed to catch spam bots - do not post there.

You were kicked from the server. You are free to rejoin.
`;

const buildRecoveryMessage = (action) => `Hey!

We are sorry to inform you that we detected **suspicious activity on your account**. Your account was caught ${action} in our server (Department of Computer Science, University of Helsinki). This almost certainly means your Discord account has been compromised, and there's a chance your computer is infected with malware as well. The most common way Discord credentials get stolen is through an unofficial login portal or an info-stealer virus. If there is a virus then your computer has likely been compromised for many months and your Discord isn't the only compromised account.

**We recommend** that you reset your Discord password. Use an offline malware scan tool like Microsoft Defender Offline Scan, Malwarebytes or ClamAV. If you find a info-stealer virus, you should reset your passwords on all platforms you use on that device.

You were kicked from the server. You are free to rejoin the server after resetting your password.
`;

const sortDims = (arr) => [...arr].sort((a, b) => a.width - b.width || a.height - b.height);

const checkImageMessageFingerprints = (images) => {
  const dims = images.map(att => ({ width: att.width, height: att.height }));
  const actual = sortDims(dims);
  return SCAM_FINGERPRINT_SETS.some(set => {
    if (set.length !== actual.length) return false;
    const expected = sortDims(set);
    return actual.every((d, i) => d.width === expected[i].width && d.height === expected[i].height);
  });
};

const banAndUnban = async (message, reason, action) => {
  await message.author.send(buildRecoveryMessage(action)).catch(logError);
  const banned = await message.guild.members.ban(message.author.id, { days: 1, reason }).catch(logError);
  if (banned) await message.guild.members.unban(message.author.id).catch(logError);
};

const banUnbanAndReport = async (message, client, reason, action) => {
  await banAndUnban(message, reason, action);
  const content = `**HONEYPOT TRIGGERED**\nMember: <@${message.author.id}> (${message.author.tag})\nChannel: <#${message.channel.id}>`;
  await sendReportToCommandsChannel(client, content);
};

const sendScamReport = async (message, images, isConfirmedScam, client) => {
  const now = Date.now();
  const last = recentlyReported.get(message.author.id);
  if (last && now - last < COOLDOWN_MS) return;
  recentlyReported.set(message.author.id, now);
  const imageDetails = images.map(att =>
    `• ${att.name} | ${att.contentType} | ${att.size}B | ${att.width}x${att.height}`,
  ).join("\n");
  const files = images.map(att => att.url);
  const header = isConfirmedScam
    ? "**SCAM MESSAGE DETECTED AND REMOVED**"
    : "<@&758046962829361262>\n**POSSIBLE SCAM IMAGES DETECTED!**";
  const messageLink = isConfirmedScam ? "" : `\nMessage: ${message.url}`;
  const content = `${header}\nMember: <@${message.author.id}> (${message.author.tag})\nChannel: <#${message.channel.id}>\nCount: ${images.size}\n${imageDetails}${messageLink}`;
  await sendReportToCommandsChannel(client, content, files);
};

const attachmentFingerprint = (attachments) => {
  if (!attachments || attachments.size === 0) return null;
  return [...attachments.values()]
    .map(a => `${a.name}:${a.size}`)
    .sort()
    .join("|");
};

const buildMessageKeys = (message) => {
  const keys = [];
  const content = message.content?.trim();
  if (content) keys.push(content);
  const fp = attachmentFingerprint(message.attachments);
  if (fp) keys.push(fp);
  return keys;
};

const cleanHoneypotChannel = async (channel) => {
  const fetched = await channel.messages.fetch({ limit: 100 }).catch(logError);
  if (!fetched) return;
  const toDelete = fetched.filter(m => !m.pinned);
  if (toDelete.size === 0) return;

  const now = Date.now();
  const recent = toDelete.filter(m => now - m.createdTimestamp < TWO_WEEKS_MS);
  const old = toDelete.filter(m => now - m.createdTimestamp >= TWO_WEEKS_MS);

  if (recent.size > 1) {
    await channel.bulkDelete(recent).catch(logError);
  }
  else if (recent.size === 1) {
    await recent.first().delete().catch(logError);
  }

  for (const msg of old.values()) {
    await msg.delete().catch(logError);
  }
};

const checkHoneypot = async (message, client) => {
  const channelName = message.channel.name;
  const isHoneypot = channelName === HONEYPOT_CHANNEL_NAME;
  const isMonitored = channelName === MONITORED_CHANNEL_NAME;

  if (!isHoneypot && !isMonitored) return;

  if (isHoneypot) {
    await cleanHoneypotChannel(message.channel);
    const userId = message.author.id;
    const initialReport = `**HONEYPOT MESSAGE**\nMember: <@${userId}> (${message.author.tag})\nChannel: <#${message.channel.id}>`;
    await sendReportToCommandsChannel(client, initialReport);
    if (honeypotPosters.has(userId)) {
      await message.author.send(buildHoneypotRepeatMessage()).catch(logError);
      const banned = await message.guild.members.ban(userId, { days: 1, reason: "Sent multiple messages in honeypot channel" }).catch(logError);
      if (banned) await message.guild.members.unban(userId).catch(logError);
      const report = `**HONEYPOT TRIGGERED**\nMember: <@${userId}> (${message.author.tag})\nChannel: <#${message.channel.id}>`;
      await sendReportToCommandsChannel(client, report);
      return;
    }
    honeypotPosters.add(userId);
  }

  const keys = buildMessageKeys(message);
  if (keys.length === 0) return;

  const userId = message.author.id;
  const [ownStore, crossStore] = isHoneypot
    ? [honeypotMessages, chatMessages]
    : [chatMessages, honeypotMessages];

  for (const key of keys) {
    addToStore(ownStore, userId, key);
  }

  if (keys.some(key => hasInStore(crossStore, userId, key))) {
    await banUnbanAndReport(message, client, "Honeypot triggered: message sent in both honeypot and chat channel", "posting a message in a honeypot channel");
  }
};

const checkAttachments = async (message, client) => {
  const images = message.attachments.filter(att => att.contentType?.startsWith("image/"));
  // Filter for messages with 4 images as all the scams contain 4 images (this isn't true anymore probs need a honeypot)
  if (images.size !== 4) return;
  const isConfirmedScam = checkImageMessageFingerprints(images);
  await sendScamReport(message, images, isConfirmedScam, client);
  if (isConfirmedScam) {
    await message.delete();
    await banAndUnban(message, "Compromized account, scam message detected", "sending a scam message");
  }
};

const firewall = async (message, client) => {
  if (message.author.bot) return;
  if (!message.member) return;
  await checkAttachments(message, client);
  await checkHoneypot(message, client);
};

const resetHoneypotState = () => {
  honeypotMessages.clear();
  chatMessages.clear();
  honeypotPosters.clear();
};

module.exports = { firewall, resetHoneypotState, startFirewallPruning };

const { sendReportToCommandsChannel } = require("./message");
const { logError } = require("./logger");
const { matchScamImages } = require("./scamImageMatcher");
const { getKnownScamImages } = require("../../db/services/scamImageService");
const { KICK_RESULT, kickWithDm, withKickResult, resetKickState } = require("./kick");
const { facultyRole, courseAdminRole } = require("../../../config.json");

const { HONEYPOT_CHANNEL_NAME, cleanHoneypotChannel } = require("./honeypot");
const STAFF_ROLE_NAMES = ["admin", "cs-admin", facultyRole];
const MONITORED_CHANNEL_NAME = "chat";
const MESSAGE_TTL_MS = 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 10 * 60 * 1000;

const honeypotMessages = new Map();
const chatMessages = new Map();
const honeypotPosters = new Map();

const cooldowns = new Map();
const COOLDOWN_MS = 2 * 60 * 1000;

const pendingScamReports = new Map();
const POSSIBLE_SCAM_REPORT_DELAY_MS = 60 * 1000;
const ADMIN_ROLE_MENTION = "<@&758046962829361262>";

const buildHoneypotRepeatMessage = () => `Hey!

You have sent multiple messages in our honeypot channel. This channel is a trap designed to catch spam bots - do not post there.

You were kicked from the server. You are free to rejoin in about a minute.
`;

const STAFF_SCAM_MESSAGE = `Hey!

A message sent from your account in our server (Department of Computer Science, University of Helsinki) matched a known scam. It was removed and the admins were notified. Your Discord account has most likely been compromised.

**Please reset your Discord password now.** Changing the password signs your account out everywhere else.

Because you have a staff role you were not kicked.

If scam messages are still sent from your account after the password reset, contact the server admins, and have every device you use Discord on checked for malware. For university devices, contact the University IT Helpdesk.
`;

const buildRecoveryMessage = (finding) => `Hey!

A message sent from your account in our server (Department of Computer Science, University of Helsinki) ${finding}. Your Discord account has most likely been compromised.

**Please reset your Discord password now.** Changing the password signs your account out everywhere else.

You were kicked from the server. You are free to rejoin in about a minute, after resetting your password.

If scam messages are still sent from your account after the password reset, have every device you use Discord on checked for malware.
`;

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

const pruneTimestampStore = (store) => {
  const now = Date.now();
  for (const [key, ts] of store) {
    if (now - ts >= MESSAGE_TTL_MS) store.delete(key);
  }
};

const postedInHoneypotWithinTtl = (userId) => {
  const ts = honeypotPosters.get(userId);
  return ts !== undefined && Date.now() - ts < MESSAGE_TTL_MS;
};

const startFirewallPruning = () =>
  setInterval(() => {
    pruneStore(honeypotMessages);
    pruneStore(chatMessages);
    pruneTimestampStore(honeypotPosters);
    pruneTimestampStore(cooldowns);
  }, PRUNE_INTERVAL_MS);

const claimCooldown = (key) => {
  const last = cooldowns.get(key);
  if (last && Date.now() - last < COOLDOWN_MS) return false;
  cooldowns.set(key, Date.now());
  return true;
};

const describeMember = (message) => `Member: <@${message.author.id}> (${message.author.tag})`;

const kickAndReport = async (message, client, models, { reason, dm, header }) => {
  cancelPossibleScamReport(message.author.id);
  const kickResult = await kickWithDm(message.guild, message.author, { reason, dm }, models);
  if (kickResult === KICK_RESULT.alreadyKicking) return;
  const content = `${header}\n${describeMember(message)}\nChannel: <#${message.channel.id}>`;
  await sendReportToCommandsChannel(client, withKickResult(content, kickResult));
};

const formatAttachmentDetail = (att) => {
  const dimensions = att.width && att.height ? ` | ${att.width}x${att.height}` : "";
  return `• ${att.name} | ${att.contentType} | ${att.size}B${dimensions}`;
};

const describeAttachments = (attachments) =>
  `Count: ${attachments.length}\n${attachments.map(formatAttachmentDetail).join("\n")}`;

const sendReportWithAttachments = async (client, content, attachments) => {
  const urls = attachments.map((att) => att.url);
  try {
    await sendReportToCommandsChannel(client, content, urls);
  } catch (error) {
    logError(error);
    await sendReportToCommandsChannel(client, `${content}\n${urls.join("\n")}`);
  }
};

const describeHashMatch = ({ matchedCount, total, scamNames }) =>
  matchedCount === 0 ? [] : [`Known scam image matches: ${matchedCount}/${total} (${scamNames.join(", ")})`];

const SCAM_REPORT_HEADERS = {
  removed: "**SCAM MESSAGE DETECTED AND REMOVED**",
  staffRemoved: `${ADMIN_ROLE_MENTION}\n**SCAM MESSAGE FROM A STAFF ACCOUNT REMOVED**`,
  possible: `${ADMIN_ROLE_MENTION}\n**POSSIBLE SCAM IMAGES DETECTED!**`
};

const sendScamReport = async (message, images, kind, client, notes = []) => {
  if (!claimCooldown(`report:${kind}:${message.author.id}`)) return;
  const header = SCAM_REPORT_HEADERS[kind];
  const messageLink = kind === "possible" ? `\nMessage: ${message.url}` : "";
  const noteLines = notes.map((note) => `\n${note}`).join("");
  const content = `${header}\n${describeMember(message)}\nChannel: <#${message.channel.id}>\n${describeAttachments(images)}${noteLines}${messageLink}`;
  await sendReportWithAttachments(client, content, images);
};

const attachmentFingerprint = (attachments) => {
  if (!attachments || attachments.size === 0) return null;
  return [...attachments.values()]
    .map((a) => `${a.name}:${a.size}`)
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

const sendHoneypotReport = async (message, client) => {
  const messageContent = message.content?.trim() || "*(no text content)*";
  const content = `**HONEYPOT MESSAGE**\nMember: <@${message.author.id}> (${message.author.tag})\nChannel: <#${message.channel.id}>\nMessage: ${messageContent}`;
  const attachments = [...(message.attachments?.values() ?? [])];
  if (attachments.length === 0) return await sendReportToCommandsChannel(client, content);
  await sendReportWithAttachments(client, `${content}\n${describeAttachments(attachments)}`, attachments);
};

const checkHoneypot = async (message, client, models) => {
  const channelName = message.channel.name;
  const isHoneypot = channelName === HONEYPOT_CHANNEL_NAME;
  const isMonitored = channelName === MONITORED_CHANNEL_NAME;

  if (!isHoneypot && !isMonitored) return;

  if (isHoneypot) {
    await sendHoneypotReport(message, client);
    await cleanHoneypotChannel(message.channel);
    const userId = message.author.id;
    if (postedInHoneypotWithinTtl(userId)) {
      return await kickAndReport(message, client, models, {
        reason: "Sent multiple messages in honeypot channel",
        dm: buildHoneypotRepeatMessage(),
        header: "**HONEYPOT REPEAT MESSAGE KICK**"
      });
    }
    honeypotPosters.set(userId, Date.now());
  }

  const keys = buildMessageKeys(message);
  if (keys.length === 0) return;

  const userId = message.author.id;
  const [ownStore, crossStore] = isHoneypot ? [honeypotMessages, chatMessages] : [chatMessages, honeypotMessages];

  for (const key of keys) {
    addToStore(ownStore, userId, key);
  }

  if (keys.some((key) => hasInStore(crossStore, userId, key))) {
    await kickAndReport(message, client, models, {
      reason: "Honeypot triggered: message sent in both honeypot and chat channel",
      dm: buildRecoveryMessage("was also posted in a channel meant to catch spam bots"),
      header: "**HONEYPOT TRIGGERED**"
    });
  }
};

const schedulePossibleScamReport = (message, images, client, notes) => {
  const userId = message.author.id;
  if (pendingScamReports.has(userId)) return;
  const timer = setTimeout(() => {
    pendingScamReports.delete(userId);
    sendScamReport(message, images, "possible", client, notes).catch(logError);
  }, POSSIBLE_SCAM_REPORT_DELAY_MS);
  pendingScamReports.set(userId, timer);
};

const cancelPossibleScamReport = (userId) => {
  clearTimeout(pendingScamReports.get(userId));
  pendingScamReports.delete(userId);
};

const isStaff = (member) =>
  Boolean(
    member?.roles?.cache?.some(
      (role) => STAFF_ROLE_NAMES.includes(role.name) || role.name.endsWith(` ${courseAdminRole}`)
    )
  );

const loadKnownScamImages = async (models) => {
  try {
    return await getKnownScamImages(models.ScamImage);
  } catch (error) {
    logError(error);
    return [];
  }
};

const removeStaffScamMessage = async (message, images, client, notes) => {
  await sendScamReport(message, images, "staffRemoved", client, [
    ...notes,
    "Matches a known scam, but the member has a staff role, so they were not kicked. Their account may be compromised."
  ]).catch(logError);
  await message.delete().catch(logError);
  if (claimCooldown(`staff-dm:${message.author.id}`)) await message.author.send(STAFF_SCAM_MESSAGE).catch(logError);
};

const removeScamMessageAndKick = async (message, images, client, models, notes) => {
  await sendScamReport(message, images, "removed", client, notes).catch(logError);
  await message.delete().catch(logError);
  const kickResult = await kickWithDm(
    message.guild,
    message.author,
    { reason: "Compromised account, scam message detected", dm: buildRecoveryMessage("matched a known scam") },
    models
  );
  if (kickResult !== KICK_RESULT.failed) return;
  const content = withKickResult(`**SCAM SENDER NOT KICKED**\n${describeMember(message)}`, kickResult);
  await sendReportToCommandsChannel(client, content).catch(logError);
};

const checkAttachments = async (message, client, models) => {
  const images = message.attachments.filter((att) => att.contentType?.startsWith("image/")).map((att) => att);
  if (images.length < 2) return;
  const hashMatch = await matchScamImages(images, await loadKnownScamImages(models));
  const notes = describeHashMatch(hashMatch);
  if (!hashMatch.allMatch) {
    if (images.length === 4 || hashMatch.partialMatch) schedulePossibleScamReport(message, images, client, notes);
    return;
  }
  cancelPossibleScamReport(message.author.id);
  if (isStaff(message.member)) return await removeStaffScamMessage(message, images, client, notes);
  await removeScamMessageAndKick(message, images, client, models, notes);
};

const firewall = async (message, client, models) => {
  if (message.author.bot) return;
  if (!message.member) return;
  await checkAttachments(message, client, models);
  await checkHoneypot(message, client, models);
};

const resetHoneypotState = () => {
  honeypotMessages.clear();
  chatMessages.clear();
  honeypotPosters.clear();
  cooldowns.clear();
  resetKickState();
  for (const timer of pendingScamReports.values()) clearTimeout(timer);
  pendingScamReports.clear();
};

module.exports = { firewall, resetHoneypotState, startFirewallPruning, buildRecoveryMessage };

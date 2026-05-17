const { sendReportToCommandsChannel } = require("./message");

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
];

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

const checkAttachments = async (message, client) => {
  const images = message.attachments.filter(att => att.contentType?.startsWith("image/"));
  // Filter for messages with 4 images as all the scams contain 4 images
  if (images.size !== 4) return;
  const isConfirmedScam = checkImageMessageFingerprints(images);
  if (isConfirmedScam) await message.delete();
  const now = Date.now();
  const last = recentlyReported.get(message.author.id);
  if (last && now - last < COOLDOWN_MS) return;
  recentlyReported.set(message.author.id, now);
  const imageDetails = images.map(att =>
    `• ${att.name} | ${att.contentType} | ${att.size}B | ${att.width}x${att.height}`,
  ).join("\n");
  const files = images.map(att => att.url);
  const header = isConfirmedScam ? "**SCAM MESSAGE DETECTED AND REMOVED**" : "<@&758046962829361262>\n**POSSIBLE SCAM IMAGES DETECTED!**";
  const content = `${header}\nMember: ${message.member.displayName} (${message.author.tag})\nChannel: ${message.channel.name}\nCount: ${images.size}\n${imageDetails}`;
  await sendReportToCommandsChannel(client, content, files);
};

const firewall = async (message, client) => {
  if (message.author.bot) return;
  if (!message.member) return;
  await checkAttachments(message, client);
};

module.exports = { firewall };

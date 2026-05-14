const { sendReportToCommandsChannel } = require("./message");

const recentlyReported = new Map();
const COOLDOWN_MS = 2 * 60 * 1000;

const checkAttachments = async (message, client) => {
  const images = message.attachments.filter(att => att.contentType?.startsWith("image/"));
  // Filter for messages with 5 images as all the scams contain 5 images
  if (images.size !== 5) return;
  const now = Date.now();
  const last = recentlyReported.get(message.author.id);
  if (last && now - last < COOLDOWN_MS) return;
  recentlyReported.set(message.author.id, now);
  const imageDetails = images.map(att =>
    `• ${att.name} | ${att.contentType} | ${att.size}B | ${att.width}x${att.height}`,
  ).join("\n");
  const content = `<@&758046962829361262>\n**POSSIBLE SCAM IMAGES DETECTED!**\nMember: ${message.member.displayName} (${message.author.tag})\nChannel: ${message.channel.name}\nCount: ${images.size}\n${imageDetails}`;
  const files = images.map(att => att.url);
  await sendReportToCommandsChannel(client, content, files);
};

const firewall = async (message, client) => {
  if (message.author.bot) return;
  if (!message.member) return;
  await checkAttachments(message, client);
};

module.exports = { firewall };

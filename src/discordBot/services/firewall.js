const { sendReportToCommandsChannel } = require("./message");
const { logError } = require("./logger");

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

const recoveryMessage = `Hey!

We are sorry to inform you that we detected **suspicious activity on your account**. Your account was caught sending a scam message in our server (Department of Computer Science, University of Helsinki). This almost certainly means your Discord account has been compromised, and there's a chance your computer is infected with malware as well. The most common way Discord credentials get stolen is through an unofficial login portal or an info-stealer virus. If there is a virus then your computer has likely been compromised for many months and your Discord isn't the only compromised account.

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

const dmAndKick = async (message) => {
  await message.author.send(recoveryMessage).catch(logError);
  await message.member.kick("Compromized account, scam message detected").catch(logError);
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
  const content = `${header}\nMember: ${message.member.displayName} (${message.author.tag})\nChannel: ${message.channel.name}\nCount: ${images.size}\n${imageDetails}`;
  await sendReportToCommandsChannel(client, content, files);
};

const checkAttachments = async (message, client) => {
  const images = message.attachments.filter(att => att.contentType?.startsWith("image/"));
  // Filter for messages with 4 images as all the scams contain 4 images (this isn't true anymore probs need a honeypot)
  if (images.size !== 4) return;
  const isConfirmedScam = checkImageMessageFingerprints(images);
  await sendScamReport(message, images, isConfirmedScam, client);
  if (isConfirmedScam) {
    await message.delete();
    await dmAndKick(message);
  }
};

const firewall = async (message, client) => {
  if (message.author.bot) return;
  if (!message.member) return;
  await checkAttachments(message, client);
};

module.exports = { firewall };

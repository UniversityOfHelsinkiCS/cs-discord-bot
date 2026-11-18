const { ChannelType } = require("discord.js");
const { logError } = require("./logger");
const HONEYPOT_CHANNEL_NAME = "do_not_post";
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
const HONEYPOT_MESSAGE = `
# Tämä on ansa boteille. Älä laita viestiä tänne tai sinut saatetaan poistaa serveriltä.

# Det här är en fälla för bottar. Posta inte här, annars riskerar du att bli utkastad.

# This is a trap for bots. Do not post here or you might get kicked.
`;

const hasCurrentInfoText = (message) => message.content === HONEYPOT_MESSAGE.trim();

const cleanHoneypotChannel = async (channel) => {
  const fetched = await channel.messages.fetch({ limit: 100 }).catch(logError);
  if (!fetched) return;
  const toDelete = fetched.filter((m) => !m.pinned);
  if (toDelete.size === 0) return;

  const now = Date.now();
  const recent = toDelete.filter((m) => now - m.createdTimestamp < TWO_WEEKS_MS);
  const old = toDelete.filter((m) => now - m.createdTimestamp >= TWO_WEEKS_MS);

  if (recent.size > 1) {
    await channel.bulkDelete(recent).catch(logError);
  } else if (recent.size === 1) {
    await recent.first().delete().catch(logError);
  }

  for (const msg of old.values()) {
    await msg.delete().catch(logError);
  }
};

const fetchBotPins = async (channel) => {
  const pins = await channel.messages.fetchPins();
  return pins.items.map((pin) => pin.message).filter((message) => message.author?.bot);
};

const setInitialHoneypotMessage = async (guild) => {
  console.log("Started initializing honeypot message");
  const honeypotChannel = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildText && c.name === HONEYPOT_CHANNEL_NAME
  );
  if (!honeypotChannel) {
    console.error("Honeypot channel not found!");
    return;
  }

  const botPins = await fetchBotPins(honeypotChannel);
  const infoMessage = botPins.find(hasCurrentInfoText) ?? botPins[0];
  for (const extraPin of botPins.filter((pin) => pin !== infoMessage)) {
    await extraPin.delete().catch(logError);
  }

  await cleanHoneypotChannel(honeypotChannel);

  if (!infoMessage) {
    const sentMessage = await honeypotChannel.send(HONEYPOT_MESSAGE);
    await sentMessage.pin();
  } else if (!hasCurrentInfoText(infoMessage)) {
    await infoMessage.edit(HONEYPOT_MESSAGE);
  }

  console.log("Honeypot message initialized");
};

module.exports = {
  setInitialHoneypotMessage,
  cleanHoneypotChannel,
  HONEYPOT_CHANNEL_NAME
};

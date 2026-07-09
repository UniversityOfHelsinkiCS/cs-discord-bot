const HONEYPOT_CHANNEL_NAME = "do_not_post";
const HONEYPOT_MESSAGE = `
# Tämä on ansa boteille. Älä laitaviestiä tänne tai sinut saatetaan poistaa serveriltä.

# Det här är en fälla för bottar. Posta inte här, annars riskerar du att bli utkastad.

# This is a trap for bots. Do not post here or you might get kicked.
`;

const setInitialHoneypotMessage = async (guild) => {
  console.log("Started initializing honeypot message");
  const honeypotChannel = guild.channels.cache.find(c => c.type === "GUILD_TEXT" && c.name === HONEYPOT_CHANNEL_NAME);
  if (!honeypotChannel) {
    console.error("Honeypot channel not found!");
    return;
  }

  const pinnedMessages = await honeypotChannel.messages.fetchPinned();
  let infoMessage = pinnedMessages.find(m => m.content === HONEYPOT_MESSAGE.trim());

  const messages = await honeypotChannel.messages.fetch();
  const otherMessages = messages.filter(m => m.id !== infoMessage?.id);

  if (otherMessages.size > 0) {
    await honeypotChannel.bulkDelete(otherMessages, true);
  }

  if (!infoMessage) {
    infoMessage = await honeypotChannel.send(HONEYPOT_MESSAGE);
    await infoMessage.pin();
  }

  console.log("Honeypot message initialized");
};

module.exports = {
  setInitialHoneypotMessage, HONEYPOT_CHANNEL_NAME,
};

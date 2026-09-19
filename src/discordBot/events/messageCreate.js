const { sendReplyMessage } = require("../services/message");
const { firewall } = require("../services/firewall");

const execute = async (message, client, models) => {
  if (message.author.bot || !message.member) return;
  await firewall(message, client);
  if (!message.content?.startsWith("/")) return;

  // Someone typed or copy-pasted a slash command as plain text instead of using the command picker.
  const [commandName, ...args] = message.content.slice(1).trim().toLowerCase().split(/ +/);
  const channel = message.channel;
  const guideChannel = client.guild.channels.cache.find((c) => c.name === "guide");
  const copyPasteGuideReply =
    "Sorry, <@" +
    message.author +
    ">, I didn't quite catch what you meant.\nPlease read <#" +
    guideChannel +
    "> for more info on commands and available courses.\n" +
    "You can also type `/help` to view a helpful *(pun intended)* list of commands.\n" +
    "Note that you have to **manually** type the commands; I rarely understand copy-pasted commands!";

  if (!client.slashCommands.has(commandName)) {
    return sendReplyMessage(message, channel, copyPasteGuideReply);
  }

  if (commandName === "join") {
    const roleString = args.shift()?.trim();
    if (!roleString) return sendReplyMessage(message, channel, copyPasteGuideReply);
    // Command execution handles permissions and whether the course is valid
    message.roleString = roleString;
    client.slashCommands.get(commandName).execute(message, client, models);
  }
};

module.exports = {
  name: "messageCreate",
  execute
};

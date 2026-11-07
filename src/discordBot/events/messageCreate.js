const { firewall } = require("../services/firewall");

const execute = async (message, client) => {
  if (message.author.bot || !message.member) return;
  await firewall(message, client);
};

module.exports = {
  name: "messageCreate",
  execute
};

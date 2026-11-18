const { firewall } = require("../services/firewall");

const execute = async (message, client, models) => {
  if (message.author.bot || !message.member) return;
  await firewall(message, client, models);
};

module.exports = {
  name: "messageCreate",
  execute
};

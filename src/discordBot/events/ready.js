const { initializeApplicationContext } = require("../services/init");
const { setUpCommands } = require("../services/command");
const { pruneUsersNotInGuild } = require("../../db/services/userService");

const execute = async (client, models) => {
  client.guild = await client.guilds.fetch(process.env.GUILD_ID);
  await initializeApplicationContext(client, models);
  await setUpCommands(client, models.Course);
  await client.guild.members.fetch();
  await pruneUsersNotInGuild(client.guild, models.User);
  console.log(`${client.user.tag} initialized!`);
};

module.exports = {
  name: "ready",
  once: true,
  execute,
};

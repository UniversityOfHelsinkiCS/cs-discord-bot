const { initializeApplicationContext } = require("../services/init");
const { setUpCommands } = require("../services/command");
const { pruneUsersNotInGuild } = require("../../db/services/userService");
const { logError } = require("../services/logger");

const fetchAllMembers = async (guild, attempts = 3) => {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await guild.members.fetch({ time: 45000 });
    }
    catch (error) {
      logError(error);
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  return null;
};

const execute = async (client, models) => {
  client.guild = await client.guilds.fetch(process.env.GUILD_ID);
  await initializeApplicationContext(client, models);
  await setUpCommands(client, models.Course);

  const members = await fetchAllMembers(client.guild);
  if (members) {
    await pruneUsersNotInGuild(client.guild, models.User);
  }
  console.log(`${client.user.tag} initialized!`);
};

module.exports = {
  name: "ready",
  once: true,
  execute,
};

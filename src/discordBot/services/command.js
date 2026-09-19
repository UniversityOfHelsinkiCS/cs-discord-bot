const fs = require("fs");
const { Collection } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const clientId = process.env.BOT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.DISCORD_BOT_TOKEN;
const { logError } = require("./logger");

const deployCommands = async (commands) => {
  const rest = new REST({ version: "10" }).setToken(token);

  (async () => {
    try {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands
      });
      console.log("Successfully registered application commands.");
    } catch (error) {
      logError(error);
      console.error(error);
    }
  })();
};

const loadCommands = (client) => {
  const commands = [];
  const slashCommands = new Collection();
  const commandFolders = fs
    .readdirSync("./src/discordBot/commands/", { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  for (const folder of commandFolders) {
    const slashCommandFiles = fs
      .readdirSync(`./src/discordBot/commands/${folder}`)
      .filter((file) => file.endsWith(".js"));
    for (const file of slashCommandFiles) {
      const command = require(`../commands/${folder}/${file}`);
      slashCommands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    }
    client.slashCommands = new Collection([...slashCommands.entries()].sort());
  }
  console.log("Successfully loaded all bot commands.");
  return commands;
};

const setUpCommands = async (client) => {
  const commands = loadCommands(client);
  if (process.env.NODE_ENV === "production") await deployCommands(commands);
};

module.exports = {
  setUpCommands
};

require("dotenv").config({ quiet: true });
const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const models = require("../db/dbInit");
const { logError } = require("./services/logger");

const token = process.env.DISCORD_BOT_TOKEN;
const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.MessageContent
];
const client = new Client({ intents: intents });

const eventFiles = fs.readdirSync("./src/discordBot/events").filter((file) => file.endsWith(".js"));
for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  const runEvent = (...args) => event.execute(...args).catch(logError);
  if (event.once) {
    client.once(event.name, (...args) => runEvent(...args, models));
  } else {
    client.on(event.name, (...args) => runEvent(...args, client, models));
  }
}

const startDiscordBot = async () => {
  await client.login(token);
  console.log("Discord bot logged in");
};

module.exports = {
  client,
  startDiscordBot
};

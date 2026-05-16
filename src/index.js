require("dotenv").config();
require("./sentry");
const { sequelize, connectToDatabase } = require("./db/index");
const startServer = require("./server/server");
const { client, startDiscordBot } = require("./discordBot/index");
const { telegramClient, startTelegramBot } = require("./telegramBot/index");
const { startBridge } = require("./telegramBot/bridge/index");
const { resetCounters } = require("./promMetrics/promCounters");

const start = async () => {
  await connectToDatabase();
  startServer(sequelize);
  resetCounters();
  await startDiscordBot();
  if (process.env.TG_BRIDGE_ENABLED) {
    await startTelegramBot();
    startBridge(client, telegramClient);
  }
};

start().catch(async (err) => {
  const Sentry = require("@sentry/node");
  Sentry.captureException(err);
  await Sentry.flush(2000);
  console.error("Fatal startup error:", err);
  process.exit(1);
});
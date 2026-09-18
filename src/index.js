require("dotenv").config();
require("./sentry");
const { sequelize, connectToDatabase } = require("./db/index");
const startServer = require("./server/server");
const { startDiscordBot } = require("./discordBot/index");
const { resetCounters } = require("./promMetrics/promCounters");

const start = async () => {
  await connectToDatabase();
  startServer(sequelize);
  resetCounters();
  await startDiscordBot();
};

start().catch(async (err) => {
  const Sentry = require("@sentry/node");
  Sentry.captureException(err);
  await Sentry.flush(2000);
  console.error("Fatal startup error:", err);
  process.exit(1);
});
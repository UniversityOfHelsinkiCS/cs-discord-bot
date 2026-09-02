const { sequelize } = require("./dbInit");
const { logError } = require("./../discordBot/services/logger");
const Umzug = require("umzug");

const DB_CONNECTION_RETRY_LIMIT = 10;

const runMigrations = async () => {
  const migrator = new Umzug({
    storage: "sequelize",
    storageOptions: {
      sequelize,
      tableName: "migrations",
    },
    migrations: {
      params: [sequelize.getQueryInterface()],
      path: `${process.cwd()}/src/db/migrations`,
      pattern: /\.js$/,
    },
  });
  const migrations = await migrator.up();
  console.log("Ran the following migrations: ", {
    files: migrations.map((mig) => mig.file),
  });
};

const testConnection = async () => {
  await sequelize.authenticate();
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectToDatabase = async (attempt = 0) => {
  try {
    await testConnection();
    console.log("Connected to database");
    await sequelize.sync();
    try {
      await runMigrations();
    }
    catch (err) {
      logError(err);
      console.log("Failed to run migrations: \n " + err);
    }
    const [hashColumn] = await sequelize.query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'joined_users' AND column_name = 'discordIdHash'`,
      { type: sequelize.QueryTypes.SELECT },
    );
    if (!hashColumn) {
      logError(new Error("joined_users.discordIdHash missing - encryption migration did not apply"));
      const Sentry = require("@sentry/node");
      await Sentry.flush(2000);
      return process.exit(1);
    }
  }
  catch (err) {
    logError(err);
    if (attempt === DB_CONNECTION_RETRY_LIMIT) {
      console.log(`Connection to database failed after ${attempt} attempts`);
      const Sentry = require("@sentry/node");
      await Sentry.flush(2000);
      return process.exit(1);
    }
    console.log(
      `Connection to database failed! Attempt ${attempt} of ${DB_CONNECTION_RETRY_LIMIT}`,
    );
    await sleep(5000);
    return connectToDatabase(attempt + 1);
  }
  return null;
};

module.exports = {
  sequelize,
  connectToDatabase,
};

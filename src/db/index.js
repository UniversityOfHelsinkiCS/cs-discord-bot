const { sequelize } = require("./dbInit");
const { assertEncryptionKey } = require("./crypto");
const { logError } = require("./../discordBot/services/logger");
const Umzug = require("umzug");

const DB_CONNECTION_RETRY_LIMIT = 10;

const shutDown = async (error) => {
  if (error) logError(error);
  const Sentry = require("@sentry/node");
  await Sentry.flush(2000);
  return process.exit(1);
};

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

// findUserByDiscordId matches on the discordIdHash blind index alone, so a row with
// no hash is invisible to every lookup in the bot. Booting in that state does not
// error - it silently creates a second user row for everyone who predates the
// migration, while their course memberships stay attached to the original row.
// Checking that the column exists is not enough: the migration adds it nullable and
// backfills it in a later transaction, and runMigrations() swallows the failure.
const encryptionMigrationProblem = async () => {
  const [hashColumn] = await sequelize.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'joined_users' AND column_name = 'discordIdHash'`,
    { type: sequelize.QueryTypes.SELECT },
  );
  if (!hashColumn) {
    return "joined_users.discordIdHash missing - encryption migration did not apply";
  }

  const [unhashedRow] = await sequelize.query(
    "SELECT id FROM joined_users WHERE \"discordIdHash\" IS NULL LIMIT 1",
    { type: sequelize.QueryTypes.SELECT },
  );
  if (unhashedRow) {
    return `joined_users has rows without a discordIdHash (id ${unhashedRow.id}) - encryption backfill did not finish`;
  }

  const [hashIndex] = await sequelize.query(
    `SELECT 1
       FROM pg_index idx
       JOIN pg_class rel ON rel.oid = idx.indrelid
       JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
       JOIN pg_attribute att ON att.attrelid = idx.indrelid AND att.attnum = ANY (idx.indkey)
      WHERE rel.relname = 'joined_users'
        AND nsp.nspname = current_schema()
        AND idx.indisunique
        AND idx.indnatts = 1
        AND att.attname = 'discordIdHash'`,
    { type: sequelize.QueryTypes.SELECT },
  );
  if (!hashIndex) {
    return "joined_users.discordIdHash is not unique - encryption migration did not finish";
  }

  return null;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectToDatabase = async (attempt = 0) => {
  // Before the connection, and well before runMigrations(): the encrypting migration
  // rewrites joined_users irreversibly, so it must never start under a key that is
  // missing or malformed. A bad key is not a transient fault, so this sits outside the
  // retry loop below - retrying it ten times would only delay the same exit.
  try {
    assertEncryptionKey();
  }
  catch (err) {
    return shutDown(err);
  }

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
    const migrationProblem = await encryptionMigrationProblem();
    if (migrationProblem) {
      return shutDown(new Error(migrationProblem));
    }
  }
  catch (err) {
    logError(err);
    if (attempt === DB_CONNECTION_RETRY_LIMIT) {
      console.log(`Connection to database failed after ${attempt} attempts`);
      return shutDown();
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

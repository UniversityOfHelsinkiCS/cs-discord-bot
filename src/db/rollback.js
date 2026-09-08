"use strict";

// One-off runner for the `down` step of encryptUserIdentity-migration.js.
// No Umzug CLI is wired into this project, so this rebuilds the same migrator
// config as src/db/index.js and reverts that single migration.
//
//   NODE_ENV=production node src/db/rollback.js
//
// FIELD_ENCRYPTION_KEY must still be present - the down step decrypts every row.

const { sequelize } = require("./dbInit");
const { assertEncryptionKey } = require("./crypto");
const Umzug = require("umzug");

const MIGRATION = "encryptUserIdentity-migration.js";

const run = async () => {
  // This path runs the migration without going through connectToDatabase, so it needs
  // the same check: the down step decrypts every row and must not start without a key.
  assertEncryptionKey();
  await sequelize.authenticate();

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

  const reverted = await migrator.down({ migrations: [MIGRATION] });
  console.log("Reverted migrations:", reverted.map((m) => m.file));
  await sequelize.close();
};

run().then(
  () => process.exit(0),
  (err) => {
    console.error("Rollback failed:", err);
    process.exit(1);
  },
);

"use strict";

const path = require("path");
const { Umzug, SequelizeStorage } = require("umzug");

// Migrations are ordered by file name, and executed migrations are recorded in the
// "migrations" table by file name (including ".js"), so existing files must never be renamed.
const createMigrator = (sequelize) =>
  new Umzug({
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize, tableName: "migrations" }),
    migrations: {
      glob: ["*.js", { cwd: path.join(__dirname, "migrations") }],
      // The migration files export up(queryInterface)/down(queryInterface).
      resolve: ({ name, path: filePath, context }) => {
        const migration = require(filePath);
        return {
          name,
          up: async () => migration.up(context),
          down: async () => migration.down(context)
        };
      }
    },
    logger: undefined
  });

module.exports = { createMigrator };

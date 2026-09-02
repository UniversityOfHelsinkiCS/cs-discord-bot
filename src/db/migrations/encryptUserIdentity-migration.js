"use strict";

const { QueryTypes, DataTypes } = require("sequelize");
const { encrypt, decrypt, blindIndex, isEncrypted } = require("../crypto");

const TABLE = "joined_users";

// describeTable() does not honour the connection search_path and can resolve to a
// stale same-named table in another schema, so every guard here is scoped to
// current_schema() explicitly and the DDL calls carry that schema too.
const currentSchema = async (queryInterface, transaction) => {
  const rows = await queryInterface.sequelize.query("SELECT current_schema() AS schema", {
    type: QueryTypes.SELECT,
    transaction,
  });
  return rows[0].schema;
};

const columnInfo = async (queryInterface, schema, column) => {
  const rows = await queryInterface.sequelize.query(
    `SELECT data_type, is_nullable
       FROM information_schema.columns
      WHERE table_schema = :schema AND table_name = :table AND column_name = :column`,
    { type: QueryTypes.SELECT, replacements: { schema, table: TABLE, column } },
  );
  return rows[0] || null;
};

// Single-column unique constraints on joined_users.<column>, resolved by column
// rather than by a hard-coded name (a fresh-DB sequelize.sync() auto-names them).
const singleColumnUniqueConstraints = async (queryInterface, schema, column) => {
  const rows = await queryInterface.sequelize.query(
    `SELECT con.conname AS conname
       FROM pg_constraint con
       JOIN pg_class rel ON rel.oid = con.conrelid
       JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
       JOIN pg_attribute att
         ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
      WHERE rel.relname = :table
        AND nsp.nspname = :schema
        AND con.contype = 'u'
        AND array_length(con.conkey, 1) = 1
        AND att.attname = :column`,
    { type: QueryTypes.SELECT, replacements: { schema, table: TABLE, column } },
  );
  return rows.map((r) => r.conname);
};

module.exports = {
  up: async (queryInterface) => {
    const schema = await currentSchema(queryInterface);
    const table = { tableName: TABLE, schema };

    // 1. Widen name / discordId to TEXT (ciphertext is longer than the source value).
    const nameCol = await columnInfo(queryInterface, schema, "name");
    if (nameCol && nameCol.data_type !== "text") {
      await queryInterface.changeColumn(table, "name", { type: DataTypes.TEXT, allowNull: false });
    }
    const idCol = await columnInfo(queryInterface, schema, "discordId");
    if (idCol && idCol.data_type !== "text") {
      await queryInterface.changeColumn(table, "discordId", { type: DataTypes.TEXT, allowNull: false });
    }

    // 2. Add the blind-index column (nullable until the backfill has run).
    if (!(await columnInfo(queryInterface, schema, "discordIdHash"))) {
      await queryInterface.addColumn(table, "discordIdHash", {
        type: DataTypes.CHAR(64),
        allowNull: true,
      });
    }

    // 3. Encrypt + hash every not-yet-processed row in one transaction. The filter
    //    plus re-deriving from plaintext makes a partial run safe to resume.
    await queryInterface.sequelize.transaction(async (transaction) => {
      const rows = await queryInterface.sequelize.query(
        `SELECT id, name, "discordId" AS "discordId"
           FROM ${TABLE}
          WHERE "discordIdHash" IS NULL OR "discordId" NOT LIKE 'v1:%'`,
        { type: QueryTypes.SELECT, transaction },
      );
      for (const row of rows) {
        const plainName = isEncrypted(row.name) ? decrypt(row.name) : row.name;
        const plainId = isEncrypted(row.discordId) ? decrypt(row.discordId) : row.discordId;
        await queryInterface.sequelize.query(
          `UPDATE ${TABLE}
              SET name = :name, "discordId" = :discordId, "discordIdHash" = :hash
            WHERE id = :id`,
          {
            type: QueryTypes.UPDATE,
            transaction,
            replacements: {
              name: encrypt(plainName),
              discordId: encrypt(plainId),
              hash: blindIndex(String(plainId)),
              id: row.id,
            },
          },
        );
      }
    });

    // 4. Lock the blind index down to NOT NULL.
    const hashCol = await columnInfo(queryInterface, schema, "discordIdHash");
    if (hashCol && hashCol.is_nullable === "YES") {
      await queryInterface.changeColumn(table, "discordIdHash", {
        type: DataTypes.CHAR(64),
        allowNull: false,
      });
    }

    // 5. Uniqueness on the blind index.
    if ((await singleColumnUniqueConstraints(queryInterface, schema, "discordIdHash")).length === 0) {
      await queryInterface.addConstraint(table, {
        fields: ["discordIdHash"],
        type: "unique",
        name: "joined_users_discordIdHash_key",
      });
    }

    // 6. Drop the now-meaningless unique constraint(s) on the randomized discordId ciphertext.
    for (const name of await singleColumnUniqueConstraints(queryInterface, schema, "discordId")) {
      await queryInterface.removeConstraint(table, name);
    }
  },

  down: async (queryInterface) => {
    const schema = await currentSchema(queryInterface);
    const table = { tableName: TABLE, schema };

    // Requires FIELD_ENCRYPTION_KEY to still be present.
    await queryInterface.sequelize.transaction(async (transaction) => {
      const rows = await queryInterface.sequelize.query(
        `SELECT id, name, "discordId" AS "discordId" FROM ${TABLE}`,
        { type: QueryTypes.SELECT, transaction },
      );
      for (const row of rows) {
        await queryInterface.sequelize.query(
          `UPDATE ${TABLE} SET name = :name, "discordId" = :discordId WHERE id = :id`,
          {
            type: QueryTypes.UPDATE,
            transaction,
            replacements: {
              name: isEncrypted(row.name) ? decrypt(row.name) : row.name,
              discordId: isEncrypted(row.discordId) ? decrypt(row.discordId) : row.discordId,
              id: row.id,
            },
          },
        );
      }
    });

    for (const name of await singleColumnUniqueConstraints(queryInterface, schema, "discordIdHash")) {
      await queryInterface.removeConstraint(table, name);
    }

    if (await columnInfo(queryInterface, schema, "discordIdHash")) {
      await queryInterface.removeColumn(table, "discordIdHash");
    }

    if ((await singleColumnUniqueConstraints(queryInterface, schema, "discordId")).length === 0) {
      await queryInterface.addConstraint(table, {
        fields: ["discordId"],
        type: "unique",
        name: "joined_users_discordId_key",
      });
    }

    await queryInterface.changeColumn(table, "discordId", { type: DataTypes.STRING, allowNull: false });
    await queryInterface.changeColumn(table, "name", { type: DataTypes.STRING, allowNull: false });
  },
};

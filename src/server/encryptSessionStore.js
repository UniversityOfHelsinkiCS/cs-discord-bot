"use strict";

// connect-session-sequelize hard-codes JSON.parse / JSON.stringify on the `data`
// column and exposes no serializer hook, so encrypt at the Sequelize model layer
// instead. Every read/write of `data` still flows through this model.
const { encrypt, decrypt, isEncrypted } = require("../db/crypto");

const toArray = (result) => {
  if (Array.isArray(result)) return result;
  if (result) return [result];
  return [];
};

module.exports = (store) => {
  const model = store.sessionModel;
  // sequelize-mock (used by the server tests) has no addHook.
  if (!model || typeof model.addHook !== "function") return store;

  model.addHook("beforeSave", (session) => {
    if (session.data !== null && session.data !== undefined && !isEncrypted(session.data)) {
      session.data = encrypt(session.data);
    }
  });

  model.addHook("afterFind", (result) => {
    for (const session of toArray(result)) {
      if (session && isEncrypted(session.data)) {
        session.data = decrypt(session.data);
      }
    }
  });

  return store;
};

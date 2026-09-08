// src/db/crypto.js has no fallback key in any NODE_ENV, so that the encrypting
// migration can never run under a key nobody chose. Tests therefore have to supply
// one. This is the same all-sevens key that used to be hardcoded in crypto.js, so
// nothing here is secret - it exists only to keep the test suite deterministic.
process.env.FIELD_ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY
  || Buffer.alloc(32, 7).toString("base64");

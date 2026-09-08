"use strict";

const crypto = require("crypto");

const VERSION = "v1";
const KEY_ENV = "FIELD_ENCRYPTION_KEY";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// There is deliberately no fallback key for any NODE_ENV. A fallback would let the
// encrypting migration run against a key the operator never chose and cannot
// reproduce, which rewrites every row in joined_users irreversibly. Tests supply a
// fixed key through __tests__/setup/env.js instead.
const loadMasterKey = () => {
  const raw = process.env[KEY_ENV];
  if (!raw) {
    throw new Error(`${KEY_ENV} is not set - refusing to run with unprotected identity fields`);
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(`${KEY_ENV} must decode to ${KEY_LENGTH} bytes (got ${key.length}) - generate one with: openssl rand -base64 ${KEY_LENGTH}`);
  }
  return key;
};

// Portable domain-separated subkeys - no reliance on crypto.hkdfSync.
const deriveKey = (masterKey, label) => crypto.createHmac("sha256", masterKey).update(label).digest();

// Derived on first use rather than at import time. Importing this module must not
// throw: a bad key raised from inside a require() several layers up the stack escapes
// the top-level start().catch() in src/index.js and lands as an uncaught exception,
// which never reaches logError. assertEncryptionKey() below is the one deliberate
// place the key is validated, so the failure follows the normal shutdown path.
let subkeys = null;
const getSubkeys = () => {
  if (!subkeys) {
    const masterKey = loadMasterKey();
    subkeys = {
      enc: deriveKey(masterKey, "joined_users/field-enc/v1"),
      index: deriveKey(masterKey, "joined_users/blind-index/v1"),
    };
  }
  return subkeys;
};

// Throws if the key is missing or the wrong size. Call this before anything can read
// or write an encrypted field, and in particular before the migrations run, so the
// encrypting migration can never execute under a key the process cannot reproduce.
const assertEncryptionKey = () => {
  getSubkeys();
};

const isEncrypted = (value) => typeof value === "string" && value.startsWith(`${VERSION}:`);

const encrypt = (plaintext) => {
  if (plaintext === null || plaintext === undefined) return plaintext;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", getSubkeys().enc, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const packed = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
  return `${VERSION}:${packed.toString("base64")}`;
};

// Deliberately throws rather than returning a placeholder: pruneUsersNotInGuild
// deletes every user it cannot match against the guild, so a decrypt failure must
// never be allowed to look like an empty or garbage value.
const decrypt = (value) => {
  if (value === null || value === undefined) return value;
  // Tolerate legacy plaintext during the deploy window.
  if (!isEncrypted(value)) return value;
  const packed = Buffer.from(value.slice(VERSION.length + 1), "base64");
  if (packed.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error(`${KEY_ENV}: ciphertext is truncated (${packed.length} bytes, expected at least ${IV_LENGTH + TAG_LENGTH})`);
  }
  const iv = packed.subarray(0, IV_LENGTH);
  const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getSubkeys().enc, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  }
  catch (err) {
    // Raw GCM auth failures surface as "unable to authenticate data", which gives no
    // hint that the cause is almost always a changed or mistyped FIELD_ENCRYPTION_KEY.
    throw new Error(`${KEY_ENV} does not decrypt this ${VERSION} value - the key does not match the one it was encrypted with (${err.message})`);
  }
};

// Deterministic blind index for equality lookups + uniqueness on an otherwise
// randomized-ciphertext column. 64 lowercase hex chars.
const blindIndex = (plaintext) => {
  if (plaintext === null || plaintext === undefined) return plaintext;
  return crypto.createHmac("sha256", getSubkeys().index).update(String(plaintext)).digest("hex");
};

module.exports = { encrypt, decrypt, blindIndex, isEncrypted, assertEncryptionKey, VERSION };

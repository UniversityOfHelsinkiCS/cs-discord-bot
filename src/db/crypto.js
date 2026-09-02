"use strict";

const crypto = require("crypto");

const VERSION = "v1";
const KEY_ENV = "FIELD_ENCRYPTION_KEY";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

const loadMasterKey = () => {
  const raw = process.env[KEY_ENV];
  if (!raw) {
    if (process.env.NODE_ENV === "test") return Buffer.alloc(32, 7);
    throw new Error(`${KEY_ENV} is not set - refusing to boot with unprotected identity fields`);
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(`${KEY_ENV} must decode to 32 bytes (got ${key.length})`);
  }
  return key;
};

const masterKey = loadMasterKey();

// Portable domain-separated subkeys - no reliance on crypto.hkdfSync.
const deriveKey = (label) => crypto.createHmac("sha256", masterKey).update(label).digest();
const encKey = deriveKey("joined_users/field-enc/v1");
const indexKey = deriveKey("joined_users/blind-index/v1");

const isEncrypted = (value) => typeof value === "string" && value.startsWith(`${VERSION}:`);

const encrypt = (plaintext) => {
  if (plaintext === null || plaintext === undefined) return plaintext;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const packed = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
  return `${VERSION}:${packed.toString("base64")}`;
};

const decrypt = (value) => {
  if (value === null || value === undefined) return value;
  // Tolerate legacy plaintext during the deploy window.
  if (!isEncrypted(value)) return value;
  const packed = Buffer.from(value.slice(VERSION.length + 1), "base64");
  const iv = packed.subarray(0, IV_LENGTH);
  const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv("aes-256-gcm", encKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
};

// Deterministic blind index for equality lookups + uniqueness on an otherwise
// randomized-ciphertext column. 64 lowercase hex chars.
const blindIndex = (plaintext) => {
  if (plaintext === null || plaintext === undefined) return plaintext;
  return crypto.createHmac("sha256", indexKey).update(String(plaintext)).digest("hex");
};

module.exports = { encrypt, decrypt, blindIndex, isEncrypted, VERSION };

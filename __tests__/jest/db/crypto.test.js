const { encrypt, decrypt, blindIndex, isEncrypted, VERSION } = require("../../../src/db/crypto");

// Runs on the fixed NODE_ENV=test dummy key baked into src/db/crypto.js, so
// there is no setup / env requirement.

describe("crypto", () => {

  describe("encrypt / decrypt", () => {
    test("round-trips ascii, unicode and long strings", () => {
      const samples = [
        "JonDoe",
        "123456789012345678",
        "ääkkösiä ja 漢字 と 絵文字 😀",
        "x".repeat(5000),
      ];
      for (const s of samples) {
        expect(decrypt(encrypt(s))).toBe(s);
      }
    });

    test("output is versioned and non-deterministic", () => {
      const a = encrypt("same-input");
      const b = encrypt("same-input");
      expect(a.startsWith(`${VERSION}:`)).toBe(true);
      expect(a).not.toBe(b);
      expect(decrypt(a)).toBe("same-input");
      expect(decrypt(b)).toBe("same-input");
    });

    test("passes null / undefined through untouched", () => {
      expect(encrypt(null)).toBeNull();
      expect(encrypt(undefined)).toBeUndefined();
      expect(decrypt(null)).toBeNull();
      expect(decrypt(undefined)).toBeUndefined();
    });

    test("decrypt tolerates legacy plaintext", () => {
      expect(decrypt("plain-value")).toBe("plain-value");
    });

    test("decrypt throws on a tampered ciphertext", () => {
      const token = encrypt("secret");
      const raw = Buffer.from(token.slice(VERSION.length + 1), "base64");
      raw[raw.length - 1] ^= 0xff;
      const tampered = `${VERSION}:${raw.toString("base64")}`;
      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe("blindIndex", () => {
    test("is deterministic and 64 lowercase hex chars", () => {
      const h = blindIndex("123456789012345678");
      expect(h).toMatch(/^[0-9a-f]{64}$/);
      expect(blindIndex("123456789012345678")).toBe(h);
    });

    test("coerces numbers so DB strings and runtime strings match", () => {
      expect(blindIndex(10)).toBe(blindIndex("10"));
    });

    test("differs per input", () => {
      expect(blindIndex("a")).not.toBe(blindIndex("b"));
    });

    test("passes null / undefined through untouched", () => {
      expect(blindIndex(null)).toBeNull();
      expect(blindIndex(undefined)).toBeUndefined();
    });
  });

  describe("isEncrypted", () => {
    test("is true only for the version-prefixed string", () => {
      expect(isEncrypted(encrypt("x"))).toBe(true);
      expect(isEncrypted("plain")).toBe(false);
      expect(isEncrypted("")).toBe(false);
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted(10)).toBe(false);
    });
  });

});

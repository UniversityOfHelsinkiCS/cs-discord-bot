const sharp = require("sharp");
const { hashImage, hashReferenceImage, hammingDistance } = require("../../src/discordBot/services/perceptualHash");
const { MATCH_THRESHOLD } = require("../../src/discordBot/services/scamImageMatcher");
const { patternImage, blankImage, PATTERN_COUNT } = require("../mocks/patternImage");

jest.mock("../../src/discordBot/services/logger", () => ({ logError: jest.fn() }));

const closestDistance = (hash, references) => Math.min(...references.map((known) => hammingDistance(known, hash)));

describe("hammingDistance", () => {
  test("counts differing bits", () => {
    expect(hammingDistance("0000000000000000", "0000000000000000")).toBe(0);
    expect(hammingDistance("0000000000000000", "000000000000000f")).toBe(4);
    expect(hammingDistance("ffffffffffffffff", "0000000000000000")).toBe(64);
  });
});

describe("hashImage", () => {
  test("returns a 64-bit hex hash", async () => {
    expect(await hashImage(await patternImage(0))).toMatch(/^[0-9a-f]{16}$/);
  });

  test("a resized copy hashes almost the same", async () => {
    const original = await patternImage(0);
    const resized = await sharp(original).resize(213, 267).toBuffer();
    expect(hammingDistance(await hashImage(original), await hashImage(resized))).toBeLessThanOrEqual(2);
  });

  test("a recompressed JPEG copy hashes almost the same", async () => {
    const original = await patternImage(1);
    const recompressed = await sharp(original).resize(500, 625).jpeg({ quality: 50 }).toBuffer();
    expect(hammingDistance(await hashImage(original), await hashImage(recompressed))).toBeLessThanOrEqual(4);
  });

  test("different images are far apart", async () => {
    const hashes = await Promise.all(
      Array.from({ length: PATTERN_COUNT }, async (_, index) => hashImage(await patternImage(index)))
    );
    for (let first = 0; first < hashes.length; first++) {
      for (let second = first + 1; second < hashes.length; second++) {
        expect(hammingDistance(hashes[first], hashes[second])).toBeGreaterThan(MATCH_THRESHOLD);
      }
    }
  });

  test("a near-blank image is not hashed", async () => {
    expect(await hashImage(await blankImage())).toBeNull();
  });
});

describe("hashReferenceImage", () => {
  test("includes hashes of centre crops", async () => {
    const hashes = await hashReferenceImage(await patternImage(2));
    expect(hashes.length).toBeGreaterThan(1);
  });

  test("a lightly cropped copy matches one of the reference hashes", async () => {
    const original = await patternImage(2);
    const references = await hashReferenceImage(original);
    const cropped = await sharp(original).extract({ left: 32, top: 40, width: 576, height: 720 }).toBuffer();
    expect(closestDistance(await hashImage(cropped), references)).toBeLessThanOrEqual(MATCH_THRESHOLD);
  });

  test("a near-blank image gives no hashes", async () => {
    expect(await hashReferenceImage(await blankImage())).toEqual([]);
  });
});

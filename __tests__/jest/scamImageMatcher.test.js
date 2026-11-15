const axios = require("axios");
const sharp = require("sharp");
const { matchScamImages, previewUrl } = require("../../src/discordBot/services/scamImageMatcher");
const { hashReferenceImage } = require("../../src/discordBot/services/perceptualHash");
const { logError } = require("../../src/discordBot/services/logger");
const { patternImage } = require("../mocks/patternImage");

jest.mock("axios");
jest.mock("../../src/discordBot/services/logger", () => ({ logError: jest.fn() }));

const attachment = (name) => ({
  name,
  url: `https://cdn.example.com/${name}`,
  proxyURL: `https://media.example.com/${name}`,
  width: 1280,
  height: 1600
});

const serveImages = (imagesByName) => {
  axios.get.mockImplementation(async (url) => {
    const name = new URL(url).pathname.slice(1);
    if (!imagesByName[name]) throw new Error("404");
    return { data: imagesByName[name] };
  });
};

let references;
let images;

beforeAll(async () => {
  const originals = await Promise.all([0, 1, 2].map((index) => patternImage(index)));
  references = await Promise.all(
    originals.map(async (image, index) => ({
      chain: "story",
      image: `${index}.png`,
      hashes: await hashReferenceImage(image)
    }))
  );
  images = {
    "a.png": await sharp(originals[0]).resize(256, 320).toBuffer(),
    "b.png": await sharp(originals[1]).resize(256, 320).jpeg({ quality: 70 }).toBuffer(),
    "c.png": await sharp(originals[2]).resize(256, 320).toBuffer(),
    "other.png": await patternImage(3)
  };
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("previewUrl", () => {
  test("asks the media proxy for a small copy with the same aspect ratio", () => {
    const url = new URL(previewUrl(attachment("a.png")));
    expect(url.origin).toBe("https://media.example.com");
    expect(url.searchParams.get("width")).toBe("205");
    expect(url.searchParams.get("height")).toBe("256");
  });

  test("uses the original URL when the size is unknown", () => {
    expect(previewUrl({ ...attachment("a.png"), width: null })).toBe("https://cdn.example.com/a.png");
  });
});

describe("matchScamImages", () => {
  test("every image matching a known scam image is a full match", async () => {
    serveImages(images);
    const result = await matchScamImages([attachment("a.png"), attachment("b.png"), attachment("c.png")], references);
    expect(result).toEqual({ total: 3, matchedCount: 3, chains: ["story"], allMatch: true, partialMatch: false });
  });

  test("two known images next to an unknown one is a partial match", async () => {
    serveImages(images);
    const result = await matchScamImages(
      [attachment("a.png"), attachment("b.png"), attachment("other.png")],
      references
    );
    expect(result).toMatchObject({ matchedCount: 2, allMatch: false, partialMatch: true });
  });

  test("one known image is not a match", async () => {
    serveImages(images);
    const result = await matchScamImages([attachment("a.png"), attachment("other.png")], references);
    expect(result).toMatchObject({ matchedCount: 1, allMatch: false, partialMatch: false });
  });

  test("an image that fails to download counts as not matching", async () => {
    serveImages(images);
    const result = await matchScamImages([attachment("a.png"), attachment("missing.png")], references);
    expect(result).toMatchObject({ matchedCount: 1, allMatch: false });
    expect(logError).toHaveBeenCalledTimes(1);
  });

  test("downloads nothing when there are no known scam images", async () => {
    const result = await matchScamImages([attachment("a.png"), attachment("b.png")], []);
    expect(result.allMatch).toBe(false);
    expect(axios.get).not.toHaveBeenCalled();
  });

  test("downloads nothing for a single image", async () => {
    const result = await matchScamImages([attachment("a.png")], references);
    expect(result.matchedCount).toBe(0);
    expect(axios.get).not.toHaveBeenCalled();
  });
});

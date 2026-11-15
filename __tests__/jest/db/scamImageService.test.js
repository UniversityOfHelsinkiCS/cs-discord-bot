const {
  getKnownScamImages,
  scamChainExists,
  addScamImageChain,
  clearScamImageCache
} = require("../../../src/db/services/scamImageService");

const makeModel = (rows = []) => ({
  findAll: jest.fn(async () => rows),
  findOne: jest.fn(async ({ where }) => rows.find((row) => row.chain === where.chain) ?? null),
  bulkCreate: jest.fn(async (created) => rows.push(...created))
});

afterEach(() => {
  clearScamImageCache();
});

describe("scamImageService", () => {
  test("returns known scam images as references", async () => {
    const ScamImage = makeModel([{ chain: "story", imageName: "1.png", hashes: ["00ff"] }]);
    expect(await getKnownScamImages(ScamImage)).toEqual([{ chain: "story", image: "1.png", hashes: ["00ff"] }]);
  });

  test("reads the database once until a chain is added", async () => {
    const ScamImage = makeModel([{ chain: "story", imageName: "1.png", hashes: ["00ff"] }]);
    await getKnownScamImages(ScamImage);
    await getKnownScamImages(ScamImage);
    expect(ScamImage.findAll).toHaveBeenCalledTimes(1);

    await addScamImageChain("new", [{ name: "2.png", hashes: ["ff00"] }], ScamImage);
    const images = await getKnownScamImages(ScamImage);
    expect(ScamImage.findAll).toHaveBeenCalledTimes(2);
    expect(images).toContainEqual({ chain: "new", image: "2.png", hashes: ["ff00"] });
  });

  test("stores every image of a chain under the chain name", async () => {
    const ScamImage = makeModel();
    await addScamImageChain(
      "story",
      [
        { name: "1.png", hashes: ["aa"] },
        { name: "2.png", hashes: ["bb", "cc"] }
      ],
      ScamImage
    );
    expect(ScamImage.bulkCreate).toHaveBeenCalledWith([
      { chain: "story", imageName: "1.png", hashes: ["aa"] },
      { chain: "story", imageName: "2.png", hashes: ["bb", "cc"] }
    ]);
  });

  test("tells whether a chain name is taken", async () => {
    const ScamImage = makeModel([{ chain: "story", imageName: "1.png", hashes: ["aa"] }]);
    expect(await scamChainExists("story", ScamImage)).toBe(true);
    expect(await scamChainExists("other", ScamImage)).toBe(false);
  });
});

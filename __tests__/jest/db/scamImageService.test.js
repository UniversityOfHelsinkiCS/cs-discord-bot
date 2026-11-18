const {
  getKnownScamImages,
  scamNameExists,
  addScamFingerprints,
  listScams,
  removeScam,
  clearScamImageCache
} = require("../../../src/db/services/scamImageService");

const makeModel = (initialRows = []) => {
  let rows = [...initialRows];
  return {
    findAll: jest.fn(async () => rows),
    findOne: jest.fn(async ({ where }) => rows.find((row) => row.scamName === where.scamName) ?? null),
    bulkCreate: jest.fn(async (created) => rows.push(...created)),
    destroy: jest.fn(async ({ where }) => {
      const before = rows.length;
      rows = rows.filter((row) => row.scamName !== where.scamName);
      return before - rows.length;
    })
  };
};

const addedAt = new Date("2026-11-16T10:00:00Z");

afterEach(() => {
  clearScamImageCache();
});

describe("scamImageService", () => {
  test("returns known scam images as references", async () => {
    const ScamImage = makeModel([{ scamName: "story", imageName: "1.png", hashes: ["00ff"] }]);
    expect(await getKnownScamImages(ScamImage)).toEqual([{ scamName: "story", image: "1.png", hashes: ["00ff"] }]);
  });

  test("reads the database once until fingerprints are added", async () => {
    const ScamImage = makeModel([{ scamName: "story", imageName: "1.png", hashes: ["00ff"] }]);
    await getKnownScamImages(ScamImage);
    await getKnownScamImages(ScamImage);
    expect(ScamImage.findAll).toHaveBeenCalledTimes(1);

    await addScamFingerprints("new", [{ name: "2.png", hashes: ["ff00"] }], ScamImage);
    const images = await getKnownScamImages(ScamImage);
    expect(ScamImage.findAll).toHaveBeenCalledTimes(2);
    expect(images).toContainEqual({ scamName: "new", image: "2.png", hashes: ["ff00"] });
  });

  test("stores every image of a scam under the scam name", async () => {
    const ScamImage = makeModel();
    await addScamFingerprints(
      "story",
      [
        { name: "1.png", hashes: ["aa"] },
        { name: "2.png", hashes: ["bb", "cc"] }
      ],
      ScamImage
    );
    expect(ScamImage.bulkCreate).toHaveBeenCalledWith([
      { scamName: "story", imageName: "1.png", hashes: ["aa"] },
      { scamName: "story", imageName: "2.png", hashes: ["bb", "cc"] }
    ]);
  });

  test("tells whether a scam name is taken", async () => {
    const ScamImage = makeModel([{ scamName: "story", imageName: "1.png", hashes: ["aa"] }]);
    expect(await scamNameExists("story", ScamImage)).toBe(true);
    expect(await scamNameExists("other", ScamImage)).toBe(false);
  });

  test("lists each scam once with its images", async () => {
    const ScamImage = makeModel([
      { scamName: "gift", imageName: "1.png", hashes: ["aa"], createdAt: addedAt },
      { scamName: "gift", imageName: "2.png", hashes: ["bb"], createdAt: addedAt },
      { scamName: "nitro", imageName: "3.png", hashes: ["cc"], createdAt: addedAt }
    ]);
    expect(await listScams(ScamImage)).toEqual([
      { scamName: "gift", images: ["1.png", "2.png"], addedAt },
      { scamName: "nitro", images: ["3.png"], addedAt }
    ]);
  });

  test("removes every image of a scam and stops matching them", async () => {
    const ScamImage = makeModel([
      { scamName: "gift", imageName: "1.png", hashes: ["aa"] },
      { scamName: "gift", imageName: "2.png", hashes: ["bb"] },
      { scamName: "nitro", imageName: "3.png", hashes: ["cc"] }
    ]);
    await getKnownScamImages(ScamImage);
    expect(await removeScam("gift", ScamImage)).toBe(2);
    expect(await getKnownScamImages(ScamImage)).toEqual([{ scamName: "nitro", image: "3.png", hashes: ["cc"] }]);
  });
});

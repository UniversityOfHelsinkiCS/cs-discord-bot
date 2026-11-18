let cachedScamImages = null;

const toReference = (row) => ({ scamName: row.scamName, image: row.imageName, hashes: row.hashes });

const getKnownScamImages = async (ScamImage) => {
  if (!cachedScamImages) cachedScamImages = (await ScamImage.findAll()).map(toReference);
  return cachedScamImages;
};

const scamNameExists = async (scamName, ScamImage) => Boolean(await ScamImage.findOne({ where: { scamName } }));

const addScamFingerprints = async (scamName, images, ScamImage) => {
  await ScamImage.bulkCreate(images.map(({ name, hashes }) => ({ scamName, imageName: name, hashes })));
  cachedScamImages = null;
};

const listScams = async (ScamImage) => {
  const rows = await ScamImage.findAll({
    order: [
      ["scamName", "ASC"],
      ["id", "ASC"]
    ]
  });
  const scams = new Map();
  for (const row of rows) {
    const scam = scams.get(row.scamName) ?? { scamName: row.scamName, images: [], addedAt: row.createdAt };
    scam.images.push(row.imageName);
    scams.set(row.scamName, scam);
  }
  return [...scams.values()];
};

const removeScam = async (scamName, ScamImage) => {
  const removed = await ScamImage.destroy({ where: { scamName } });
  cachedScamImages = null;
  return removed;
};

const clearScamImageCache = () => {
  cachedScamImages = null;
};

module.exports = {
  getKnownScamImages,
  scamNameExists,
  addScamFingerprints,
  listScams,
  removeScam,
  clearScamImageCache
};

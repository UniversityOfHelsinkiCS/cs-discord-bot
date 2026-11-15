let cachedScamImages = null;

const toReference = (row) => ({ chain: row.chain, image: row.imageName, hashes: row.hashes });

const getKnownScamImages = async (ScamImage) => {
  if (!cachedScamImages) cachedScamImages = (await ScamImage.findAll()).map(toReference);
  return cachedScamImages;
};

const scamChainExists = async (chain, ScamImage) => Boolean(await ScamImage.findOne({ where: { chain } }));

const addScamImageChain = async (chain, images, ScamImage) => {
  await ScamImage.bulkCreate(images.map(({ name, hashes }) => ({ chain, imageName: name, hashes })));
  cachedScamImages = null;
};

const clearScamImageCache = () => {
  cachedScamImages = null;
};

module.exports = { getKnownScamImages, scamChainExists, addScamImageChain, clearScamImageCache };

const fs = require("node:fs/promises");
const path = require("node:path");
const axios = require("axios");
const { hashReferenceImage } = require("../src/discordBot/services/perceptualHash");

const HASH_FILE = path.join(__dirname, "../src/discordBot/data/scamImageHashes.json");

const isUrl = (source) => /^https?:\/\//.test(source);

const readImage = async (source) => {
  if (!isUrl(source)) return fs.readFile(source);
  const response = await axios.get(source, { responseType: "arraybuffer", timeout: 15000 });
  return Buffer.from(response.data);
};

const imageName = (source) => path.basename(isUrl(source) ? new URL(source).pathname : source);

const main = async () => {
  const [chain, ...sources] = process.argv.slice(2);
  if (!chain || sources.length === 0) {
    console.error("Usage: npm run add-scam-images -- <chain-name> <image file or URL>...");
    process.exitCode = 1;
    return;
  }
  const known = JSON.parse(await fs.readFile(HASH_FILE, "utf8"));
  const knownHashes = new Set(known.flatMap((entry) => entry.hashes));
  for (const source of sources) {
    const hashes = await hashReferenceImage(await readImage(source));
    if (hashes.length === 0) {
      console.log(`Skipped ${source}: the image has too little detail to hash.`);
      continue;
    }
    if (hashes.every((hash) => knownHashes.has(hash))) {
      console.log(`Skipped ${source}: already known.`);
      continue;
    }
    known.push({ chain, image: imageName(source), hashes });
    hashes.forEach((hash) => knownHashes.add(hash));
    console.log(`Added ${source}: ${hashes.join(", ")}`);
  }
  await fs.writeFile(HASH_FILE, `${JSON.stringify(known, null, 2)}\n`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

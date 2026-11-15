const axios = require("axios");
const { hashImage, hammingDistance } = require("./perceptualHash");
const { logError } = require("./logger");
const knownScamImages = require("../data/scamImageHashes.json");

const MATCH_THRESHOLD = 8;
const MIN_MATCHED_IMAGES = 2;
const PREVIEW_SIZE = 256;
const DOWNLOAD_TIMEOUT_MS = 5000;
const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;

const previewUrl = (attachment) => {
  if (!attachment.proxyURL || !attachment.width || !attachment.height) return attachment.url;
  const scale = Math.min(1, PREVIEW_SIZE / Math.max(attachment.width, attachment.height));
  const url = new URL(attachment.proxyURL);
  url.searchParams.set("width", String(Math.max(1, Math.round(attachment.width * scale))));
  url.searchParams.set("height", String(Math.max(1, Math.round(attachment.height * scale))));
  return url.toString();
};

const downloadImage = async (url) => {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: DOWNLOAD_TIMEOUT_MS,
    maxContentLength: MAX_DOWNLOAD_BYTES
  });
  return Buffer.from(response.data);
};

const hashAttachment = async (attachment) => {
  try {
    return await hashImage(await downloadImage(previewUrl(attachment)));
  } catch (error) {
    logError(error);
    return null;
  }
};

const findKnownImage = (hash, references) =>
  references.find((reference) => reference.hashes.some((known) => hammingDistance(known, hash) <= MATCH_THRESHOLD));

const noMatch = (total) => ({ total, matchedCount: 0, chains: [], allMatch: false, partialMatch: false });

const matchScamImages = async (images, references = knownScamImages) => {
  if (references.length === 0 || images.length < MIN_MATCHED_IMAGES) return noMatch(images.length);
  const hashes = await Promise.all(images.map(hashAttachment));
  const matches = hashes.map((hash) => hash && findKnownImage(hash, references)).filter(Boolean);
  const matchedCount = matches.length;
  const allMatch = matchedCount === images.length;
  return {
    total: images.length,
    matchedCount,
    chains: [...new Set(matches.map((match) => match.chain))],
    allMatch,
    partialMatch: !allMatch && matchedCount >= MIN_MATCHED_IMAGES
  };
};

module.exports = { matchScamImages, previewUrl, MATCH_THRESHOLD };

const axios = require("axios");
const { hashImage, hammingDistance } = require("./perceptualHash");
const { logError } = require("./logger");

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

const downloadPreview = async (attachment) => {
  const response = await axios.get(previewUrl(attachment), {
    responseType: "arraybuffer",
    timeout: DOWNLOAD_TIMEOUT_MS,
    maxContentLength: MAX_DOWNLOAD_BYTES
  });
  return Buffer.from(response.data);
};

const hashAttachment = async (attachment) => {
  try {
    return await hashImage(await downloadPreview(attachment));
  } catch (error) {
    logError(error);
    return null;
  }
};

const findClosestKnownImage = (hash, references) => {
  let closest = null;
  for (const reference of references) {
    for (const known of reference.hashes) {
      const distance = hammingDistance(known, hash);
      if (!closest || distance < closest.distance) closest = { distance, reference };
    }
  }
  return closest;
};

const isMatch = (closest) => Boolean(closest) && closest.distance <= MATCH_THRESHOLD;

const isDebugEnabled = () => process.env.SCAM_IMAGE_DEBUG === "true";

const describeComparison = (image, hash, closest) => {
  if (!hash) return `  ${image.name}: not hashed (too little detail, or could not be downloaded)`;
  if (!closest) return `  ${image.name} ${hash}: no known hashes to compare against`;
  const { scamName, image: imageName } = closest.reference;
  const verdict = isMatch(closest) ? "MATCH" : "no match";
  return `  ${image.name} ${hash}: distance ${closest.distance} to ${scamName}/${imageName} (${verdict})`;
};

const logComparisons = (images, hashes, closestImages) => {
  const lines = images.map((image, index) => describeComparison(image, hashes[index], closestImages[index]));
  console.log(`Scam image comparison, match threshold ${MATCH_THRESHOLD}:\n${lines.join("\n")}`);
};

const noMatch = (total) => ({ total, matchedCount: 0, scamNames: [], allMatch: false, partialMatch: false });

const matchScamImages = async (images, references) => {
  if (references.length === 0 || images.length < MIN_MATCHED_IMAGES) return noMatch(images.length);
  const hashes = await Promise.all(images.map(hashAttachment));
  const closestImages = hashes.map((hash) => hash && findClosestKnownImage(hash, references));
  if (isDebugEnabled()) logComparisons(images, hashes, closestImages);
  const matches = closestImages.filter(isMatch).map((closest) => closest.reference);
  const matchedCount = matches.length;
  const allMatch = matchedCount === images.length;
  return {
    total: images.length,
    matchedCount,
    scamNames: [...new Set(matches.map((match) => match.scamName))],
    allMatch,
    partialMatch: !allMatch && matchedCount >= MIN_MATCHED_IMAGES
  };
};

module.exports = { matchScamImages, downloadPreview, previewUrl, MATCH_THRESHOLD };

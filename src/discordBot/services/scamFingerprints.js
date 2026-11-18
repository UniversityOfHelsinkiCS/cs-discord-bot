const { getKnownScamImages, scamNameExists, addScamFingerprints } = require("../../db/services/scamImageService");
const { hashReferenceImage } = require("./perceptualHash");
const { downloadPreview } = require("./scamImageMatcher");
const { logError } = require("./logger");
const { editEphemeral, editErrorEphemeral } = require("./message");

const isImage = (attachment) => attachment.contentType?.startsWith("image/");

const hashScamImage = async (attachment, knownHashes) => {
  try {
    const hashes = await hashReferenceImage(await downloadPreview(attachment));
    if (hashes.length === 0) return { attachment, skipped: "too little detail to recognise" };
    if (hashes.every((hash) => knownHashes.has(hash))) return { attachment, skipped: "already a known scam image" };
    return { attachment, hashes };
  } catch (error) {
    logError(error);
    return { attachment, skipped: "could not be downloaded or read" };
  }
};

const describeSkipped = (results) =>
  results
    .filter((result) => result.skipped)
    .map((result) => `\n• ${result.attachment.name}: ${result.skipped}`)
    .join("");

const saveScamImages = async (interaction, rawScamName, attachments, models) => {
  const scamName = rawScamName.trim();
  if (!scamName) return await editErrorEphemeral(interaction, "Give the scam a name.");
  if (await scamNameExists(scamName, models.ScamImage)) {
    return await editErrorEphemeral(interaction, `A scam called "${scamName}" already exists. Pick another name.`);
  }

  const knownHashes = new Set((await getKnownScamImages(models.ScamImage)).flatMap((image) => image.hashes));
  const results = await Promise.all(attachments.map((attachment) => hashScamImage(attachment, knownHashes)));
  const added = results.filter((result) => result.hashes);
  if (added.length === 0) {
    return await editErrorEphemeral(interaction, `No images were added.${describeSkipped(results)}`);
  }

  await addScamFingerprints(
    scamName,
    added.map((result) => ({ name: result.attachment.name, hashes: result.hashes })),
    models.ScamImage
  );
  const skippedNote = added.length < results.length ? `\nSkipped:${describeSkipped(results)}` : "";
  const imageCount = added.length === 1 ? "1 image" : `${added.length} images`;
  await editEphemeral(interaction, `Added ${imageCount} to the scam "${scamName}".${skippedNote}`);
};

module.exports = { isImage, saveScamImages };

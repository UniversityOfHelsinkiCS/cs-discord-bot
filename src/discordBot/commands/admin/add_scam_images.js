const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { getKnownScamImages, scamChainExists, addScamImageChain } = require("../../../db/services/scamImageService");
const { hashReferenceImage } = require("../../services/perceptualHash");
const { downloadPreview } = require("../../services/scamImageMatcher");
const { requireAdmin } = require("../../services/permissions");
const { logError } = require("../../services/logger");
const { sendEphemeral, editEphemeral, editErrorEphemeral } = require("../../services/message");

const MAX_IMAGES = 10;
const IMAGE_OPTION_NAMES = Array.from({ length: MAX_IMAGES }, (_slot, index) => `image${index + 1}`);

const isImage = (attachment) => attachment.contentType?.startsWith("image/");

const hashUploadedImage = async (attachment, knownHashes) => {
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

const execute = async (interaction, client, models) => {
  await sendEphemeral(interaction, "Adding scam images...");
  if (!(await requireAdmin(interaction, models))) return;

  const chain = interaction.options.getString("chain").trim();
  if (!chain) return await editErrorEphemeral(interaction, "Give the scam chain a name.");
  if (await scamChainExists(chain, models.ScamImage)) {
    return await editErrorEphemeral(interaction, `A scam chain called "${chain}" already exists. Pick another name.`);
  }

  const attachments = IMAGE_OPTION_NAMES.map((name) => interaction.options.getAttachment(name)).filter(Boolean);
  const notImages = attachments.filter((attachment) => !isImage(attachment));
  if (notImages.length > 0) {
    const names = notImages.map((attachment) => attachment.name).join(", ");
    return await editErrorEphemeral(interaction, `These files are not images: ${names}`);
  }

  const knownHashes = new Set((await getKnownScamImages(models.ScamImage)).flatMap((image) => image.hashes));
  const results = await Promise.all(attachments.map((attachment) => hashUploadedImage(attachment, knownHashes)));
  const added = results.filter((result) => result.hashes);
  if (added.length === 0) {
    return await editErrorEphemeral(interaction, `No images were added.${describeSkipped(results)}`);
  }

  await addScamImageChain(
    chain,
    added.map((result) => ({ name: result.attachment.name, hashes: result.hashes })),
    models.ScamImage
  );
  const skippedNote = added.length < results.length ? `\nSkipped:${describeSkipped(results)}` : "";
  const imageCount = added.length === 1 ? "1 image" : `${added.length} images`;
  await editEphemeral(interaction, `Added ${imageCount} to the scam chain "${chain}".${skippedNote}`);
};

const buildCommand = () => {
  const command = new SlashCommandBuilder()
    .setName("add_scam_images")
    .setDescription("Add the images of one scam as a chain of known scam images")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option.setName("chain").setDescription("Name for this scam").setRequired(true).setMaxLength(100)
    );
  IMAGE_OPTION_NAMES.forEach((name, index) =>
    command.addAttachmentOption((option) =>
      option
        .setName(name)
        .setDescription(`Scam image ${index + 1}`)
        .setRequired(index === 0)
    )
  );
  return command;
};

module.exports = {
  data: buildCommand(),
  execute,
  usage: "/add_scam_images chain:[name] image1:[image] image2:[image]...",
  description: "Add the images of one scam as a chain of known scam images",
  roles: ["admin"]
};

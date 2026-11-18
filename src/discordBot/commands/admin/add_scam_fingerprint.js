const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editErrorEphemeral } = require("../../services/message");
const { isImage, saveScamImages } = require("../../services/scamFingerprints");

const MAX_IMAGES = 10;
const IMAGE_OPTION_NAMES = Array.from({ length: MAX_IMAGES }, (_slot, index) => `image${index + 1}`);

const execute = async (interaction, client, models) => {
  await sendEphemeral(interaction, "Adding scam fingerprints...");
  if (!(await requireAdmin(interaction, models))) return;

  const attachments = IMAGE_OPTION_NAMES.map((name) => interaction.options.getAttachment(name)).filter(Boolean);
  const notImages = attachments.filter((attachment) => !isImage(attachment));
  if (notImages.length > 0) {
    const names = notImages.map((attachment) => attachment.name).join(", ");
    return await editErrorEphemeral(interaction, `These files are not images: ${names}`);
  }

  await saveScamImages(interaction, interaction.options.getString("scam_name"), attachments, models);
};

const buildCommand = () => {
  const command = new SlashCommandBuilder()
    .setName("add_scam_fingerprint")
    .setDescription("Add a scam's images as known scam fingerprints.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option.setName("scam_name").setDescription("Name for this scam").setRequired(true).setMaxLength(100)
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
  usage: "/add_scam_fingerprint [scam name] [images]",
  description: "Add a scam's images as known scam fingerprints.",
  roles: ["admin"]
};

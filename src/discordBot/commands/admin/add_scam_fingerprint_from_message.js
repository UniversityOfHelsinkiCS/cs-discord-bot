const {
  ActionRowBuilder,
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, sendErrorEphemeral } = require("../../services/message");
const { isImage, saveScamImages } = require("../../services/scamFingerprints");

const COMMAND_NAME = "Add scam fingerprint";
const SCAM_NAME_INPUT_ID = "scam_name";
const MODAL_TIMEOUT_MS = 10 * 60 * 1000;

const buildScamNameModal = (modalId, imageCount) =>
  new ModalBuilder()
    .setCustomId(modalId)
    .setTitle(`Add ${imageCount === 1 ? "1 image" : `${imageCount} images`} as a known scam`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(SCAM_NAME_INPUT_ID)
          .setLabel("Scam name")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      )
    );

const waitForScamName = async (interaction, modalId) => {
  try {
    return await interaction.awaitModalSubmit({
      filter: (submitted) => submitted.customId === modalId && submitted.user.id === interaction.user.id,
      time: MODAL_TIMEOUT_MS
    });
  } catch {
    return null;
  }
};

const execute = async (interaction, client, models) => {
  const images = [...interaction.targetMessage.attachments.values()].filter(isImage);
  if (images.length === 0) return sendErrorEphemeral(interaction, "That message has no image attachments.");

  const modalId = `add_scam_fingerprint:${interaction.id}`;
  await interaction.showModal(buildScamNameModal(modalId, images.length));
  const submitted = await waitForScamName(interaction, modalId);
  if (!submitted) return;

  await sendEphemeral(submitted, "Adding scam fingerprints...");
  if (!(await requireAdmin(submitted, models))) return;
  await saveScamImages({
    interaction: submitted,
    client,
    models,
    rawScamName: submitted.fields.getTextInputValue(SCAM_NAME_INPUT_ID),
    attachments: images,
    sourceUrl: interaction.targetMessage.url
  });
};

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName(COMMAND_NAME)
    .setType(ApplicationCommandType.Message)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute,
  usage: `Apps → ${COMMAND_NAME}`,
  description: "Right-click a message to add its images as known scam fingerprints.",
  roles: ["admin"]
};

const {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  LabelBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
const { requireAdmin } = require("../../services/permissions");
const {
  sendEphemeral,
  sendErrorEphemeral,
  editEphemeral,
  editErrorEphemeral,
  sendFollowUpEphemeral,
  sendReportToCommandsChannel
} = require("../../services/message");
const { isImage, saveScamImages } = require("../../services/scamFingerprints");
const { KICK_RESULT, kickWithDm, withKickResult } = require("../../services/kick");
const { buildRecoveryMessage } = require("../../services/firewall");
const { logError } = require("../../services/logger");

const COMMAND_NAME = "Kick user";
const MODAL_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_AUDIT_LOG_REASON_LENGTH = 512;
const MAX_DETAILS_LENGTH = 400;
const MAX_SCAM_NAME_LENGTH = 100;
const INPUT_IDS = { reason: "reason", details: "details", addFingerprints: "add_fingerprints", scamName: "scam_name" };
const ADD_FINGERPRINTS = "yes";

const REASONS = {
  scam_images: { label: "Scam images", isScam: true },
  scam_message: { label: "Scam message", isScam: true },
  inappropriate_behavior: { label: "Inappropriate behavior", isScam: false },
  other: { label: "Other", isScam: false }
};

const buildReasonSelect = () =>
  new StringSelectMenuBuilder()
    .setCustomId(INPUT_IDS.reason)
    .setRequired(true)
    .addOptions(
      Object.entries(REASONS).map(([value, { label }]) =>
        new StringSelectMenuOptionBuilder().setLabel(label).setValue(value)
      )
    );

const buildFingerprintSelect = (imageCount) =>
  new StringSelectMenuBuilder()
    .setCustomId(INPUT_IDS.addFingerprints)
    .setRequired(true)
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel("No").setValue("no").setDefault(true),
      new StringSelectMenuOptionBuilder()
        .setLabel(`Yes, add ${imageCount === 1 ? "the image" : `all ${imageCount} images`}`)
        .setValue(ADD_FINGERPRINTS)
    );

const buildTextInput = (customId, style, maxLength) =>
  new TextInputBuilder().setCustomId(customId).setStyle(style).setRequired(false).setMaxLength(maxLength);

const buildKickModal = (modalId, imageCount) => {
  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle(COMMAND_NAME)
    .addLabelComponents(
      new LabelBuilder().setLabel("Reason").setStringSelectMenuComponent(buildReasonSelect()),
      new LabelBuilder()
        .setLabel("Details")
        .setDescription("Required for Other. Sent to the user together with the reason.")
        .setTextInputComponent(buildTextInput(INPUT_IDS.details, TextInputStyle.Paragraph, MAX_DETAILS_LENGTH))
    );
  if (imageCount === 0) return modal;
  return modal.addLabelComponents(
    new LabelBuilder()
      .setLabel("Add the images to scam fingerprints?")
      .setDescription("Only for scam kicks. The images are saved before the kick deletes the message.")
      .setStringSelectMenuComponent(buildFingerprintSelect(imageCount)),
    new LabelBuilder()
      .setLabel("Scam name")
      .setDescription("Needed when adding the images.")
      .setTextInputComponent(buildTextInput(INPUT_IDS.scamName, TextInputStyle.Short, MAX_SCAM_NAME_LENGTH))
  );
};

const waitForModal = async (interaction, modalId) => {
  try {
    return await interaction.awaitModalSubmit({
      filter: (submitted) => submitted.customId === modalId && submitted.user.id === interaction.user.id,
      time: MODAL_TIMEOUT_MS
    });
  } catch {
    return null;
  }
};

const readChoice = (submitted, hasImages) => {
  const [reasonKey] = submitted.fields.getStringSelectValues(INPUT_IDS.reason);
  const details = submitted.fields.getTextInputValue(INPUT_IDS.details).trim();
  if (!hasImages) return { reasonKey, details, addFingerprints: false, scamName: "" };
  const [fingerprintAnswer] = submitted.fields.getStringSelectValues(INPUT_IDS.addFingerprints);
  const scamName = submitted.fields.getTextInputValue(INPUT_IDS.scamName).trim();
  return { reasonKey, details, addFingerprints: fingerprintAnswer === ADD_FINGERPRINTS, scamName };
};

const findChoiceProblem = ({ reasonKey, details, addFingerprints, scamName }) => {
  if (reasonKey === "other" && !details) return "Describe the reason in Details when choosing Other.";
  if (addFingerprints && !REASONS[reasonKey].isScam) return "Only scam kicks can add images to scam fingerprints.";
  if (addFingerprints && !scamName) return "Give the scam a name to add its images to scam fingerprints.";
  return null;
};

const describeReason = ({ reasonKey, details }) => {
  const { label } = REASONS[reasonKey];
  if (!details) return label;
  return reasonKey === "other" ? details : `${label}: ${details}`;
};

const buildKickDm = (reasonKey, reasonText) => {
  if (REASONS[reasonKey].isScam) return buildRecoveryMessage("was removed by an admin as a scam");
  return `Hey!

You were kicked from our server (Department of Computer Science, University of Helsinki) by an admin.

Reason: ${reasonText}

You are free to rejoin in about a minute.
`;
};

const describeKickResult = (target, kickResult, reasonText) => {
  if (kickResult === KICK_RESULT.alreadyKicking) return `<@${target.id}> is already being kicked.`;
  if (kickResult === KICK_RESULT.failed) return `Could not kick <@${target.id}>: the ban did not go through.`;
  return `Kicked <@${target.id}>. Reason: ${reasonText}`;
};

const reportKick = async (client, interaction, target, reasonText, kickResult) => {
  const content = [
    "**MEMBER KICKED BY AN ADMIN**",
    `Member: <@${target.id}> (${target.tag})`,
    `Channel: <#${interaction.targetMessage.channelId}>`,
    `Reason: ${reasonText}`,
    `By: <@${interaction.user.id}>`
  ].join("\n");
  await sendReportToCommandsChannel(client, withKickResult(content, kickResult)).catch(logError);
};

const findTargetProblem = (interaction) => {
  const target = interaction.targetMessage.author;
  if (target.bot) return "Bots cannot be kicked with this command.";
  if (target.id === interaction.user.id) return "You cannot kick yourself.";
  return null;
};

const execute = async (interaction, client, models) => {
  const targetProblem = findTargetProblem(interaction);
  if (targetProblem) return sendErrorEphemeral(interaction, targetProblem);

  const target = interaction.targetMessage.author;
  const images = [...interaction.targetMessage.attachments.values()].filter(isImage);
  const modalId = `kick_user:${interaction.id}`;
  await interaction.showModal(buildKickModal(modalId, images.length));
  const submitted = await waitForModal(interaction, modalId);
  if (!submitted) return;

  await sendEphemeral(submitted, "Kicking...");
  if (!(await requireAdmin(submitted, models))) return;

  const choice = readChoice(submitted, images.length > 0);
  const choiceProblem = findChoiceProblem(choice);
  if (choiceProblem) return await editErrorEphemeral(submitted, choiceProblem);

  if (choice.addFingerprints) {
    const saved = await saveScamImages({
      interaction: submitted,
      client,
      models,
      rawScamName: choice.scamName,
      attachments: images,
      sourceUrl: interaction.targetMessage.url
    });
    if (!saved) return;
  }

  const reasonText = describeReason(choice);
  const auditLogReason = `Kicked by ${interaction.user.tag}: ${reasonText}`.slice(0, MAX_AUDIT_LOG_REASON_LENGTH);
  const kickResult = await kickWithDm(
    client.guild,
    target,
    { reason: auditLogReason, dm: buildKickDm(choice.reasonKey, reasonText) },
    models
  );
  if (kickResult !== KICK_RESULT.alreadyKicking) await reportKick(client, interaction, target, reasonText, kickResult);

  const reply = choice.addFingerprints ? sendFollowUpEphemeral : editEphemeral;
  await reply(submitted, describeKickResult(target, kickResult, reasonText));
};

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName(COMMAND_NAME)
    .setType(ApplicationCommandType.Message)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute,
  usage: `Apps → ${COMMAND_NAME}`,
  description: "Right-click a message to kick its author, with a reason sent to them.",
  roles: ["admin"]
};

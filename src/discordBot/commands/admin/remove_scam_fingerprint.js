const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { listScams, removeScam } = require("../../../db/services/scamImageService");
const { confirmChoice } = require("../../services/confirm");
const { respondWithChoices } = require("../../services/autocomplete");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral, editErrorEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  await sendEphemeral(interaction, "Removing scam fingerprints...");
  if (!(await requireAdmin(interaction, models))) return;

  const scamName = interaction.options.getString("scam_name").trim();
  const scam = (await listScams(models.ScamImage)).find((known) => known.scamName === scamName);
  if (!scam) return await editErrorEphemeral(interaction, `No scam called "${scamName}".`);

  const imageCount = scam.images.length === 1 ? "1 image" : `${scam.images.length} images`;
  const confirmed = await confirmChoice(interaction, `Remove the scam "${scamName}" and its ${imageCount}?`);
  if (!confirmed) return;

  await removeScam(scamName, models.ScamImage);
  await editEphemeral(interaction, `Removed the scam "${scamName}" (${imageCount}).`);
};

const autocomplete = async (interaction, client, models) => {
  const scams = await listScams(models.ScamImage);
  await respondWithChoices(
    interaction,
    scams.map(({ scamName }) => ({ name: scamName, value: scamName }))
  );
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove_scam_fingerprint")
    .setDescription("Remove a known scam.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option.setName("scam_name").setDescription("The scam to remove").setRequired(true).setAutocomplete(true)
    ),
  execute,
  autocomplete,
  usage: "/remove_scam_fingerprint [scam name]",
  description: "Remove a known scam.",
  roles: ["admin"]
};

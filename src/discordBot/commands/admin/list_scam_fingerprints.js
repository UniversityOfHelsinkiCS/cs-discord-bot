const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { listScams } = require("../../../db/services/scamImageService");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, replyInChunks } = require("../../services/message");

const formatDate = (date) => new Date(date).toISOString().slice(0, 10);

const formatScam = ({ scamName, images, addedAt }) => {
  const imageCount = images.length === 1 ? "1 image" : `${images.length} images`;
  return `**${scamName}** (${imageCount}, added ${formatDate(addedAt)}): ${images.join(", ")}`;
};

const execute = async (interaction, client, models) => {
  await sendEphemeral(interaction, "Listing scam fingerprints...");
  if (!(await requireAdmin(interaction, models))) return;

  const scams = await listScams(models.ScamImage);
  if (scams.length === 0) return await replyInChunks(interaction, "No scam fingerprints have been added.");

  await replyInChunks(interaction, `Known scams (${scams.length}):\n${scams.map(formatScam).join("\n")}`);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list_scam_fingerprints")
    .setDescription("List the known scams.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute,
  usage: "/list_scam_fingerprints",
  description: "List the known scams.",
  roles: ["admin"]
};

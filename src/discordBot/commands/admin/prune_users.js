const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { findUnusedUserIds, removeUsersByDbIds } = require("../../../db/services/userService");
const { confirmChoice } = require("../../services/confirm");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  await sendEphemeral(interaction, "Looking for unused user records...");
  if (!(await requireAdmin(interaction, models))) return;

  const unusedIds = await findUnusedUserIds(models.User, models.CourseMember);
  if (unusedIds.length === 0) {
    return await editEphemeral(interaction, "No unused user records found.");
  }

  const confirm = await confirmChoice(
    interaction,
    `Delete ${unusedIds.length} user records with no courses and no admin or faculty rights?`
  );
  if (!confirm) {
    return;
  }

  await removeUsersByDbIds(unusedIds, models.User);
  return await editEphemeral(interaction, `Deleted ${unusedIds.length} unused user records.`);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("prune_users")
    .setDescription("Delete user records with no courses and no admin or faculty rights.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute,
  usage: "/prune_users",
  description: "Delete user records with no courses and no admin or faculty rights.",
  roles: ["admin"]
};

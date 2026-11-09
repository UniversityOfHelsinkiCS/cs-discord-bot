const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { updateInviteLinks } = require("../../services/service");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  await sendEphemeral(interaction, "Updating invite links...");
  if (!(await requireAdmin(interaction, models))) return;

  await updateInviteLinks(client.guild, models);

  return await editEphemeral(interaction, "Updated invite links.");
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("update_invitelinks")
    .setDescription("Update invitation links.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute,
  usage: "/update_invitelinks",
  description: "Update invitation links.",
  roles: ["admin"]
};

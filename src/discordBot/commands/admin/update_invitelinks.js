const { SlashCommandBuilder } = require("@discordjs/builders");
const { updateInviteLinks } = require("../../services/service");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  if (!(await requireAdmin(interaction, models))) return;

  await sendEphemeral(interaction, "Updating invite links...");

  await updateInviteLinks(client.guild);

  return await editEphemeral(interaction, "Updated invite links.");
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("update_invitelinks")
    .setDescription("Update invitation links.")
    .setDefaultPermission(false),
  execute,
  usage: "/update_invitelinks",
  description: "Update invitation links.",
  roles: ["admin"],
};

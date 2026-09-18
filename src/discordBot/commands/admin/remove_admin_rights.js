const { SlashCommandBuilder } = require("@discordjs/builders");
const { findUserByDiscordId } = require("../../../db/services/userService");
const { confirmChoice } = require("../../services/confirm");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral, editErrorEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  if (!(await requireAdmin(interaction, models))) return;

  await sendEphemeral(interaction, "Removing admin rights...");

  const targetUser = interaction.options.getUser("user");
  const user = await findUserByDiscordId(targetUser.id, models.User);

  if (!user) {
    return await editErrorEphemeral(interaction, `No user found with the id ${targetUser.id}.`);
  }

  const confirm = await confirmChoice(interaction, "Remove admin rights from " + user.name);
  if (!confirm) {
    return;
  }

  user.admin = false;
  await user.save();

  return await editEphemeral(interaction, `Removed admin rights from ${user.name}.`);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove_admin_rights")
    .setDescription("Remove admin rights from a user.")
    .setDefaultPermission(false)
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to remove admin rights from").setRequired(true)
    ),
  execute,
  usage: "/remove_admin_rights [user]",
  description: "Remove admin rights from a user.",
  roles: ["admin"]
};

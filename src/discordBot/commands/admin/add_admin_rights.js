const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { findUserByDiscordId } = require("../../../db/services/userService");
const { confirmChoice } = require("../../services/confirm");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral, editErrorEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  if (!(await requireAdmin(interaction, models))) return;

  await sendEphemeral(interaction, "Adding admin rights...");

  const targetUser = interaction.options.getUser("user");
  const user = await findUserByDiscordId(targetUser.id, models.User);

  if (!user) {
    return await editErrorEphemeral(interaction, `No user found with the id ${targetUser.id}.`);
  }

  const confirm = await confirmChoice(interaction, "Give admin rights to " + user.name);
  if (!confirm) {
    return;
  }

  user.admin = true;
  await user.save();

  return await editEphemeral(interaction, `Gave admin rights to ${user.name}.`);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add_admin_rights")
    .setDescription("Give admin rights to a user.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to give admin rights to").setRequired(true)
    ),
  execute,
  usage: "/add_admin_rights [user]",
  description: "Give admin rights to a user.",
  roles: ["admin"]
};

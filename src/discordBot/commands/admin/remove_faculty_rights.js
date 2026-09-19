const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { findUserByDiscordId } = require("../../../db/services/userService");
const { confirmChoice } = require("../../services/confirm");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral, editErrorEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  if (!(await requireAdmin(interaction, models))) return;

  await sendEphemeral(interaction, "Removing faculty rights...");

  const targetUser = interaction.options.getUser("user");
  const user = await findUserByDiscordId(targetUser.id, models.User);

  if (!user) {
    return await editErrorEphemeral(interaction, `No user found with the id ${targetUser.id}.`);
  }

  const confirm = await confirmChoice(interaction, "Remove faculty rights from " + user.name);
  if (!confirm) {
    return;
  }

  user.faculty = false;
  await user.save();

  return await editEphemeral(interaction, `Removed faculty rights from ${user.name}.`);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove_faculty_rights")
    .setDescription("Remove faculty rights from a user.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to remove faculty rights from").setRequired(true)
    ),
  execute,
  usage: "/remove_faculty_rights [user]",
  description: "Remove faculty rights from a user.",
  roles: ["admin"]
};

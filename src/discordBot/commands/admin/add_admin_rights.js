const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { createUserToDatabase } = require("../../../db/services/userService");
const { confirmChoice } = require("../../services/confirm");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral, editErrorEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  await sendEphemeral(interaction, "Adding admin rights...");
  if (!(await requireAdmin(interaction, models))) return;

  const targetUser = interaction.options.getUser("user");
  if (targetUser.bot) {
    return await editErrorEphemeral(interaction, "Bots can't be given admin rights.");
  }

  const user = await createUserToDatabase(targetUser.id, targetUser.username, models.User);

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

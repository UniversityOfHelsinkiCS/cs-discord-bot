const { SlashCommandBuilder } = require("@discordjs/builders");
const { deletecommand } = require("../../services/service");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  if (!(await requireAdmin(interaction, models))) return;

  await sendEphemeral(interaction, "Deleting command...");

  const commandName = interaction.options.getString("command_name");
  await deletecommand(client, commandName);

  return await editEphemeral(interaction, `Deleted command ${commandName}.`);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("delete_command")
    .setDescription("Delete a slash command.")
    .setDefaultPermission(false)
    .addStringOption(option =>
      option.setName("command_name")
        .setDescription("The name of the command to delete")
        .setRequired(true)),
  execute,
  usage: "/delete_command [command name]",
  description: "Delete a slash command.",
  roles: ["admin"],
};

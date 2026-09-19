const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { deletecommand, fetchRegisteredCommands } = require("../../services/service");
const { respondWithChoices } = require("../../services/autocomplete");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  if (!(await requireAdmin(interaction, models))) return;

  await sendEphemeral(interaction, "Deleting command...");

  const commandName = interaction.options.getString("command_name");
  await deletecommand(client, commandName);

  return await editEphemeral(interaction, `Deleted command ${commandName}.`);
};

const autocomplete = async (interaction, client) => {
  const commands = await fetchRegisteredCommands(client);
  const names = commands.map((c) => c.name).sort((a, b) => a.localeCompare(b));
  await respondWithChoices(
    interaction,
    names.map((name) => ({ name, value: name }))
  );
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("delete_command")
    .setDescription("Delete a slash command.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("command_name")
        .setDescription("The name of the command to delete")
        .setRequired(true)
        .setAutocomplete(true)
    ),
  execute,
  autocomplete,
  usage: "/delete_command [command name]",
  description: "Delete a slash command.",
  roles: ["admin"]
};

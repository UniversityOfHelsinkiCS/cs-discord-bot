const { SlashCommandBuilder } = require("@discordjs/builders");
const { setUpCommands } = require("../../services/command");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  if (!(await requireAdmin(interaction, models))) return;

  await sendEphemeral(interaction, "Reloading commands...");

  await setUpCommands(client, models.Course);

  return await editEphemeral(interaction, "Reloaded slash commands.");
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reload_commands")
    .setDescription("Reload slash commands.")
    .setDefaultPermission(false),
  execute,
  usage: "/reload_commands",
  description: "Reload slash commands.",
  roles: ["admin"]
};

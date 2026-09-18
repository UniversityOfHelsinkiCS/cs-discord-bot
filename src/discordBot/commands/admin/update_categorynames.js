const { SlashCommandBuilder } = require("@discordjs/builders");
const { getCourseNameFromCategory } = require("../../services/service");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  if (!(await requireAdmin(interaction, models))) return;

  await sendEphemeral(interaction, "Updating category names...");

  const channels = client.guild.channels.cache.filter(c => c.type === "GUILD_CATEGORY" && c.name.includes("🔒"));
  channels.forEach(async channel => {
    await channel.setName(`👻 ${getCourseNameFromCategory(channel)}`);
  });

  return await editEphemeral(interaction, "Updated category names.");
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("update_categorynames")
    .setDescription("Updates category names to the new format")
    .setDefaultPermission(false),
  execute,
  usage: "/update_categorynames",
  description: "Updates category names to the new format",
  roles: ["admin"],
};

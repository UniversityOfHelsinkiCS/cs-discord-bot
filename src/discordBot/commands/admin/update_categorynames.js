const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { getCourseNameFromCategory } = require("../../services/service");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  await sendEphemeral(interaction, "Updating category names...");
  if (!(await requireAdmin(interaction, models))) return;

  const channels = client.guild.channels.cache.filter(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes("🔒")
  );
  for (const channel of channels.values()) {
    await channel.setName(`👻 ${getCourseNameFromCategory(channel)}`);
  }

  return await editEphemeral(interaction, "Updated category names.");
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("update_categorynames")
    .setDescription("Updates category names to the new format")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute,
  usage: "/update_categorynames",
  description: "Updates category names to the new format",
  roles: ["admin"]
};

const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { getAdminUsers } = require("../../../db/services/userService");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, replyInChunks } = require("../../services/message");

const execute = async (interaction, client, models) => {
  if (!(await requireAdmin(interaction, models))) return;

  await sendEphemeral(interaction, "Listing admins...");

  const admins = await getAdminUsers(models.User);
  if (admins.length === 0) {
    return await replyInChunks(interaction, "No users have the admin flag in the database.");
  }

  const lines = admins.map((admin) => `${admin.name} (${admin.discordId})`);
  await replyInChunks(interaction, `Admins in the database (${admins.length}):\n${lines.join("\n")}`);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list_admins")
    .setDescription("List all users with the admin flag in the database")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute,
  usage: "/list_admins",
  description: "List all users with the admin flag in the database",
  roles: ["admin"]
};

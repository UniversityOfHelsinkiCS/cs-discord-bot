const { PermissionFlagsBits } = require("discord.js");
const { findUserByDiscordId } = require("../../db/services/userService");
const { sendErrorEphemeral } = require("./message");

const isDbAdmin = async (discordId, models) => {
  const user = await findUserByDiscordId(discordId, models.User);
  return Boolean(user?.admin);
};

// Admins can use everything faculty can.
const isDbFaculty = async (discordId, models) => {
  const user = await findUserByDiscordId(discordId, models.User);
  return Boolean(user?.admin || user?.faculty);
};

const allowOrDeny = async (interaction, allowed) => {
  if (allowed) return true;
  await sendErrorEphemeral(interaction, "You do not have permission to use this command.");
  return false;
};

const requireAdmin = async (interaction, models) =>
  allowOrDeny(interaction, await isDbAdmin(interaction.user.id, models));

const requireFaculty = async (interaction, models) =>
  allowOrDeny(interaction, await isDbFaculty(interaction.user.id, models));

const requireDiscordAdministrator = async (interaction) =>
  allowOrDeny(interaction, Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)));

module.exports = { isDbAdmin, isDbFaculty, requireAdmin, requireFaculty, requireDiscordAdministrator };

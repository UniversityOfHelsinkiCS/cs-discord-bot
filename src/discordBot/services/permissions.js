const { findUserByDiscordId } = require("../../db/services/userService");
const { sendErrorEphemeral } = require("./message");

const isDbAdmin = async (discordId, models) => {
  const user = await findUserByDiscordId(discordId, models.User);
  return Boolean(user?.admin);
};

const requireAdmin = async (interaction, models) => {
  if (await isDbAdmin(interaction.user.id, models)) return true;
  await sendErrorEphemeral(interaction, "You do not have permission to use this command.");
  return false;
};

module.exports = { isDbAdmin, requireAdmin };

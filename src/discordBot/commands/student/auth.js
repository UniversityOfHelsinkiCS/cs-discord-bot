const { SlashCommandBuilder } = require("discord.js");
const { sendEphemeral, editEphemeral } = require("../../services/message");
const { backendUrl } = require("../../services/backendUrl");
const { facultyRole } = require("../../../../config.json");

const execute = async (interaction) => {
  await sendEphemeral(interaction, "Hold on...");
  await editEphemeral(interaction, `${backendUrl}/authenticate_faculty`);
};

module.exports = {
  data: new SlashCommandBuilder().setName("auth").setDescription(`Get auth URL to acquire ${facultyRole} role.`),
  execute,
  usage: "/auth",
  description: `Get auth URL to acquire ${facultyRole} role.`
};

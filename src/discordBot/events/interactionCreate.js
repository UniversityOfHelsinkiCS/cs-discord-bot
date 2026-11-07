const { sendErrorReport, sendErrorEphemeral } = require("../services/message");
const { logError, logInteractionError } = require("../services/logger");
const { isGuideButton, handleGuideButton } = require("../services/guideButton");

const handleAutocomplete = async (interaction, client, models) => {
  const command = client.slashCommands.get(interaction.commandName);
  if (!command?.autocomplete) return;
  try {
    await command.autocomplete(interaction, client, models);
  } catch (error) {
    logError(error);
  }
};

const runCommand = async (interaction, client, models) => {
  const command = client.slashCommands.get(interaction.commandName);
  if (!command) return;
  await command.execute(interaction, client, models);
};

const getHandler = (interaction) => {
  if (isGuideButton(interaction)) return handleGuideButton;
  if (interaction.isChatInputCommand()) return runCommand;
  return null;
};

const execute = async (interaction, client, models) => {
  if (interaction.isAutocomplete()) return await handleAutocomplete(interaction, client, models);
  const handler = getHandler(interaction);
  if (!handler) return;
  try {
    await handler(interaction, client, models);
  } catch (error) {
    console.error(error);
    logInteractionError(error, client, interaction);
    await sendErrorReport(interaction, client, error.toString());
    await sendErrorEphemeral(
      interaction,
      "There was an error while executing this command - Error report sent to administrators!"
    );
  }
};

module.exports = {
  name: "interactionCreate",
  execute
};

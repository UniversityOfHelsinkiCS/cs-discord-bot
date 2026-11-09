const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");

const CONFIRM_TIMEOUT_MS = 60000;

const acknowledgeClick = async (click, interaction, content) => {
  try {
    await click.update({ content, components: [] });
  } catch {
    await interaction.editReply({ content, components: [] });
  }
};

const confirmChoice = async (interaction, msg) => {
  const answerRow = new ActionRowBuilder();
  answerRow.addComponents(
    new ButtonBuilder().setCustomId("confirm").setLabel("Confirm").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("decline").setLabel("Decline").setStyle(ButtonStyle.Danger)
  );

  const reply = await interaction.editReply({ content: `${msg}`, components: [answerRow] });

  let click;
  try {
    click = await reply.awaitMessageComponent({ componentType: ComponentType.Button, time: CONFIRM_TIMEOUT_MS });
  } catch {
    await interaction.editReply({ content: "Timeout...", components: [] });
    return false;
  }

  const confirmed = click.customId === "confirm";
  await acknowledgeClick(click, interaction, confirmed ? "Confirming..." : "Declining...");
  return confirmed;
};

module.exports = {
  confirmChoice
};

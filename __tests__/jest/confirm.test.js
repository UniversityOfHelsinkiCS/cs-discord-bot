const { confirmChoice } = require("../../src/discordBot/services/confirm");

const buildInteraction = (awaitMessageComponent) => {
  const reply = { awaitMessageComponent };
  return { interaction: { editReply: jest.fn(async () => reply) }, reply };
};

const buildClick = (customId, update = jest.fn()) => ({ customId, update });

describe("confirmChoice", () => {
  test("shows the question with confirm and decline buttons", async () => {
    const { interaction } = buildInteraction(jest.fn(async () => buildClick("confirm")));
    await confirmChoice(interaction, "Sure?");
    const [message] = interaction.editReply.mock.calls[0];
    expect(message.content).toBe("Sure?");
    expect(message.components[0].toJSON().components.map((button) => button.custom_id)).toEqual(["confirm", "decline"]);
  });

  test("returns true and answers the click when confirmed", async () => {
    const click = buildClick("confirm");
    const { interaction } = buildInteraction(jest.fn(async () => click));
    expect(await confirmChoice(interaction, "Sure?")).toBe(true);
    expect(click.update).toHaveBeenCalledWith({ content: "Confirming...", components: [] });
  });

  test("returns false and answers the click when declined", async () => {
    const click = buildClick("decline");
    const { interaction } = buildInteraction(jest.fn(async () => click));
    expect(await confirmChoice(interaction, "Sure?")).toBe(false);
    expect(click.update).toHaveBeenCalledWith({ content: "Declining...", components: [] });
  });

  test("returns false and says so when nobody answers in time", async () => {
    const { interaction } = buildInteraction(
      jest.fn(async () => {
        throw new Error("time");
      })
    );
    expect(await confirmChoice(interaction, "Sure?")).toBe(false);
    expect(interaction.editReply).toHaveBeenLastCalledWith({ content: "Timeout...", components: [] });
  });

  test("still answers through the original reply when Discord has already expired the click", async () => {
    const click = buildClick(
      "confirm",
      jest.fn(async () => {
        throw new Error("Unknown interaction");
      })
    );
    const { interaction } = buildInteraction(jest.fn(async () => click));
    expect(await confirmChoice(interaction, "Sure?")).toBe(true);
    expect(interaction.editReply).toHaveBeenLastCalledWith({ content: "Confirming...", components: [] });
  });
});

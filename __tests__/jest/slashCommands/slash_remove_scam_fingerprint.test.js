const { execute, autocomplete } = require("../../../src/discordBot/commands/admin/remove_scam_fingerprint");
const { listScams, removeScam } = require("../../../src/db/services/scamImageService");
const { confirmChoice } = require("../../../src/discordBot/services/confirm");
const { respondWithChoices } = require("../../../src/discordBot/services/autocomplete");
const { requireAdmin } = require("../../../src/discordBot/services/permissions");
const { editEphemeral, editErrorEphemeral } = require("../../../src/discordBot/services/message");

jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/permissions");
jest.mock("../../../src/discordBot/services/confirm");
jest.mock("../../../src/discordBot/services/autocomplete");
jest.mock("../../../src/db/services/scamImageService");

const models = { ScamImage: {} };
const makeInteraction = (scamName) => ({ options: { getString: jest.fn(() => scamName) } });

beforeEach(() => {
  requireAdmin.mockResolvedValue(true);
  confirmChoice.mockResolvedValue(true);
  listScams.mockResolvedValue([
    { scamName: "gift", images: ["1.png", "2.png"], addedAt: new Date() },
    { scamName: "nitro", images: ["3.png"], addedAt: new Date() }
  ]);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("slash remove_scam_fingerprint", () => {
  test("only admins can use the command", async () => {
    requireAdmin.mockResolvedValueOnce(false);
    await execute(makeInteraction("gift"), {}, models);
    expect(removeScam).not.toHaveBeenCalled();
  });

  test("removes the scam after confirmation", async () => {
    const interaction = makeInteraction(" gift ");
    await execute(interaction, {}, models);
    expect(confirmChoice).toHaveBeenCalledWith(interaction, 'Remove the scam "gift" and its 2 images?');
    expect(removeScam).toHaveBeenCalledWith("gift", models.ScamImage);
    expect(editEphemeral).toHaveBeenCalledWith(interaction, 'Removed the scam "gift" (2 images).');
  });

  test("keeps the scam when declined", async () => {
    confirmChoice.mockResolvedValueOnce(false);
    await execute(makeInteraction("nitro"), {}, models);
    expect(removeScam).not.toHaveBeenCalled();
  });

  test("explains an unknown scam name without asking to confirm", async () => {
    const interaction = makeInteraction("unknown");
    await execute(interaction, {}, models);
    expect(confirmChoice).not.toHaveBeenCalled();
    expect(removeScam).not.toHaveBeenCalled();
    expect(editErrorEphemeral).toHaveBeenCalledWith(interaction, 'No scam called "unknown".');
  });

  test("suggests the known scam names", async () => {
    const interaction = {};
    await autocomplete(interaction, {}, models);
    expect(respondWithChoices).toHaveBeenCalledWith(interaction, [
      { name: "gift", value: "gift" },
      { name: "nitro", value: "nitro" }
    ]);
  });
});

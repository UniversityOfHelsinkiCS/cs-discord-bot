const { execute } = require("../../../src/discordBot/commands/admin/reload_commands");
const { setUpCommands } = require("../../../src/discordBot/services/command");
const { requireAdmin } = require("../../../src/discordBot/services/permissions");
const { sendEphemeral, editEphemeral } = require("../../../src/discordBot/services/message");

jest.mock("../../../src/discordBot/services/command");
jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/permissions");

const { defaultAdminInteraction } = require("../../mocks/mockInteraction");

const Course = {};
const Channel = {};
const models = { Course, Channel };

requireAdmin.mockImplementation(() => true);

afterEach(() => {
  jest.clearAllMocks();
});

describe("slash reload command", () => {
  test("admin can reload commands", async () => {
    const client = defaultAdminInteraction.client;
    await execute(defaultAdminInteraction, client, models);
    expect(setUpCommands).toHaveBeenCalledTimes(1);
    expect(setUpCommands).toHaveBeenCalledWith(client);
    expect(editEphemeral).toHaveBeenCalledWith(defaultAdminInteraction, "Reloaded slash commands.");
  });

  test("non-admin cannot reload commands", async () => {
    requireAdmin.mockImplementationOnce(() => false);
    await execute(defaultAdminInteraction, defaultAdminInteraction.client, models);
    expect(sendEphemeral).toHaveBeenCalledTimes(0);
    expect(setUpCommands).toHaveBeenCalledTimes(0);
  });
});

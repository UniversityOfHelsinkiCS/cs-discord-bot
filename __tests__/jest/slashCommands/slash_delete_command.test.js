const { execute } = require("../../../src/discordBot/commands/admin/delete_command");
const { deletecommand } = require("../../../src/discordBot/services/service");
const { requireAdmin } = require("../../../src/discordBot/services/permissions");
const { sendEphemeral, editEphemeral } = require("../../../src/discordBot/services/message");

jest.mock("../../../src/discordBot/services/service");
jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/permissions");

const { defaultAdminInteraction } = require("../../mocks/mockInteraction");
const models = require("../../mocks/mockModels");

const commandName = "testcommand";
defaultAdminInteraction.options = { getString: jest.fn(() => commandName) };

requireAdmin.mockImplementation(() => true);

afterEach(() => {
  jest.clearAllMocks();
});

describe("slash delete_command command", () => {
  test("admin can delete command", async () => {
    const client = defaultAdminInteraction.client;
    await execute(defaultAdminInteraction, client, models);
    expect(deletecommand).toHaveBeenCalledTimes(1);
    expect(deletecommand).toHaveBeenCalledWith(client, commandName);
    expect(editEphemeral).toHaveBeenCalledWith(defaultAdminInteraction, `Deleted command ${commandName}.`);
  });

  test("non-admin cannot delete command", async () => {
    requireAdmin.mockImplementationOnce(() => false);
    await execute(defaultAdminInteraction, defaultAdminInteraction.client, models);
    expect(sendEphemeral).toHaveBeenCalledTimes(0);
    expect(deletecommand).toHaveBeenCalledTimes(0);
  });
});

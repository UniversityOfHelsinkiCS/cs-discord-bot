const { Collection } = require("discord.js");
const { execute, autocomplete, data } = require("../../../src/discordBot/commands/admin/delete_command");
const { deletecommand, fetchRegisteredCommands } = require("../../../src/discordBot/services/service");
const { requireAdmin } = require("../../../src/discordBot/services/permissions");
const { sendEphemeral, editEphemeral } = require("../../../src/discordBot/services/message");

jest.mock("../../../src/discordBot/services/service");
jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/permissions");
jest.mock("../../../src/discordBot/services/autocomplete");
const { respondWithChoices } = require("../../../src/discordBot/services/autocomplete");

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

describe("slash delete_command autocomplete", () => {
  test("the command option is autocompleted", () => {
    expect(data.toJSON().options[0].autocomplete).toBe(true);
  });

  test("offers the commands registered in Discord in alphabetical order", async () => {
    const client = defaultAdminInteraction.client;
    fetchRegisteredCommands.mockResolvedValueOnce(
      new Collection([
        ["1", { name: "leave" }],
        ["2", { name: "add_instructors" }],
        ["3", { name: "join" }]
      ])
    );
    await autocomplete(defaultAdminInteraction, client);
    expect(fetchRegisteredCommands).toHaveBeenCalledWith(client);
    expect(respondWithChoices).toHaveBeenCalledWith(defaultAdminInteraction, [
      { name: "add_instructors", value: "add_instructors" },
      { name: "join", value: "join" },
      { name: "leave", value: "leave" }
    ]);
  });
});

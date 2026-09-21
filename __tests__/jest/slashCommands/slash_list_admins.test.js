const { execute } = require("../../../src/discordBot/commands/admin/list_admins");
const { getAdminUsers } = require("../../../src/db/services/userService");
const { requireDiscordAdministrator } = require("../../../src/discordBot/services/permissions");
const { sendEphemeral, replyInChunks } = require("../../../src/discordBot/services/message");

jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/permissions");
jest.mock("../../../src/db/services/userService");

const { defaultAdminInteraction } = require("../../mocks/mockInteraction");
const models = require("../../mocks/mockModels");

requireDiscordAdministrator.mockImplementation(() => true);

afterEach(() => {
  jest.clearAllMocks();
});

describe("slash list_admins", () => {
  test("Only Discord administrators can use the command", async () => {
    requireDiscordAdministrator.mockImplementationOnce(() => false);
    await execute(defaultAdminInteraction, defaultAdminInteraction.client, models);
    expect(sendEphemeral).toHaveBeenCalledTimes(0);
    expect(getAdminUsers).toHaveBeenCalledTimes(0);
    expect(replyInChunks).toHaveBeenCalledTimes(0);
  });

  test("Lists every admin from the database", async () => {
    getAdminUsers.mockImplementationOnce(() => [
      { name: "JonDoe", discordId: "10", admin: true },
      { name: "JaneDoe", discordId: "11", admin: true }
    ]);
    await execute(defaultAdminInteraction, defaultAdminInteraction.client, models);
    expect(getAdminUsers).toHaveBeenCalledWith(models.User);
    expect(replyInChunks).toHaveBeenCalledWith(
      defaultAdminInteraction,
      "Admins in the database (2):\nJonDoe (10)\nJaneDoe (11)"
    );
  });

  test("Says so when nobody has the admin flag", async () => {
    getAdminUsers.mockImplementationOnce(() => []);
    await execute(defaultAdminInteraction, defaultAdminInteraction.client, models);
    expect(replyInChunks).toHaveBeenCalledWith(
      defaultAdminInteraction,
      "No users have the admin flag in the database."
    );
  });
});

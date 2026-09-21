const { execute } = require("../../../src/discordBot/commands/admin/add_admin_rights");
const { findUserByDiscordId } = require("../../../src/db/services/userService");
const { confirmChoice } = require("../../../src/discordBot/services/confirm");
const { requireAdmin } = require("../../../src/discordBot/services/permissions");
const { sendEphemeral, editEphemeral, editErrorEphemeral } = require("../../../src/discordBot/services/message");

jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/confirm");
jest.mock("../../../src/discordBot/services/permissions");
jest.mock("../../../src/db/services/userService");

const { defaultAdminInteraction } = require("../../mocks/mockInteraction");
const models = require("../../mocks/mockModels");

const targetUserId = "10";
defaultAdminInteraction.options = { getUser: jest.fn(() => ({ id: targetUserId })) };

const userModelInstanceMock = {
  id: 1,
  name: "JonDoe",
  admin: false,
  faculty: false,
  discordId: 10,
  save: jest.fn()
};

requireAdmin.mockImplementation(() => true);
confirmChoice.mockImplementation(() => true);
findUserByDiscordId.mockImplementation(() => userModelInstanceMock);

afterEach(() => {
  jest.clearAllMocks();
  userModelInstanceMock.admin = false;
});

describe("slash add_admin_rights", () => {
  test("Only admins can use the command", async () => {
    requireAdmin.mockImplementationOnce(() => false);
    await execute(defaultAdminInteraction, defaultAdminInteraction.client, models);
    expect(sendEphemeral).toHaveBeenCalledTimes(0);
    expect(findUserByDiscordId).toHaveBeenCalledTimes(0);
    expect(userModelInstanceMock.save).toHaveBeenCalledTimes(0);
  });

  test("Does nothing if user doesn't exist", async () => {
    findUserByDiscordId.mockImplementationOnce(() => null);
    await execute(defaultAdminInteraction, defaultAdminInteraction.client, models);
    expect(confirmChoice).toHaveBeenCalledTimes(0);
    expect(userModelInstanceMock.save).toHaveBeenCalledTimes(0);
    expect(editErrorEphemeral).toHaveBeenCalledTimes(1);
    expect(editErrorEphemeral).toHaveBeenCalledWith(
      defaultAdminInteraction,
      `No user found with the id ${targetUserId}.`
    );
  });

  test("Does nothing if command is declined", async () => {
    confirmChoice.mockImplementationOnce(() => false);
    await execute(defaultAdminInteraction, defaultAdminInteraction.client, models);
    expect(confirmChoice).toHaveBeenCalledTimes(1);
    expect(userModelInstanceMock.save).toHaveBeenCalledTimes(0);
    expect(userModelInstanceMock.admin).toBe(false);
  });

  test("Saves admin value if user exists", async () => {
    await execute(defaultAdminInteraction, defaultAdminInteraction.client, models);
    expect(confirmChoice).toHaveBeenCalledTimes(1);
    expect(userModelInstanceMock.save).toHaveBeenCalledTimes(1);
    expect(userModelInstanceMock.admin).toBe(true);
    expect(editEphemeral).toHaveBeenCalledWith(defaultAdminInteraction, "Gave admin rights to JonDoe.");
  });
});

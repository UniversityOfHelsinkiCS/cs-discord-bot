const { execute } = require("../../../src/discordBot/commands/admin/prune_users");
const { findUnusedUserIds, removeUsersByDbIds } = require("../../../src/db/services/userService");
const { confirmChoice } = require("../../../src/discordBot/services/confirm");
const { requireAdmin } = require("../../../src/discordBot/services/permissions");
const { editEphemeral } = require("../../../src/discordBot/services/message");
const models = require("../../mocks/mockModels");

jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/confirm");
jest.mock("../../../src/discordBot/services/permissions");
jest.mock("../../../src/db/services/userService");

const interaction = {};

beforeEach(() => {
  jest.clearAllMocks();
  requireAdmin.mockImplementation(() => true);
  confirmChoice.mockImplementation(() => true);
  findUnusedUserIds.mockImplementation(() => [3, 4]);
});

describe("slash prune_users command", () => {
  test("does nothing for non-admins", async () => {
    requireAdmin.mockImplementationOnce(() => false);
    await execute(interaction, {}, models);
    expect(findUnusedUserIds).not.toHaveBeenCalled();
    expect(removeUsersByDbIds).not.toHaveBeenCalled();
  });

  test("deletes the unused records after confirmation", async () => {
    await execute(interaction, {}, models);
    expect(findUnusedUserIds).toHaveBeenCalledWith(models.User, models.CourseMember);
    expect(removeUsersByDbIds).toHaveBeenCalledWith([3, 4], models.User);
    expect(editEphemeral).toHaveBeenCalledWith(interaction, "Deleted 2 unused user records.");
  });

  test("deletes nothing when declined", async () => {
    confirmChoice.mockImplementationOnce(() => false);
    await execute(interaction, {}, models);
    expect(removeUsersByDbIds).not.toHaveBeenCalled();
  });

  test("skips confirmation when there is nothing to delete", async () => {
    findUnusedUserIds.mockImplementationOnce(() => []);
    await execute(interaction, {}, models);
    expect(confirmChoice).not.toHaveBeenCalled();
    expect(removeUsersByDbIds).not.toHaveBeenCalled();
    expect(editEphemeral).toHaveBeenCalledWith(interaction, "No unused user records found.");
  });
});

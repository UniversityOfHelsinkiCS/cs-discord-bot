const { execute } = require("../../../src/discordBot/commands/admin/update_invitelinks");
const { updateInviteLinks } = require("../../../src/discordBot/services/service");
const { requireAdmin } = require("../../../src/discordBot/services/permissions");

jest.mock("../../../src/discordBot/services/service");
jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/permissions");

const { defaultAdminInteraction } = require("../../mocks/mockInteraction");
const models = require("../../mocks/mockModels");

requireAdmin.mockImplementation(() => true);

afterEach(() => {
  jest.clearAllMocks();
});

describe("slash update_invitelinks command", () => {
  test("non-admin cannot update invite links", async () => {
    requireAdmin.mockImplementationOnce(() => false);
    await execute(defaultAdminInteraction, defaultAdminInteraction.client, models);
    expect(updateInviteLinks).toHaveBeenCalledTimes(0);
  });

  test("admin can update invite links", async () => {
    const client = defaultAdminInteraction.client;
    await execute(defaultAdminInteraction, client, models);
    expect(updateInviteLinks).toHaveBeenCalledTimes(1);
    expect(updateInviteLinks).toHaveBeenCalledWith(client.guild);
  });
});

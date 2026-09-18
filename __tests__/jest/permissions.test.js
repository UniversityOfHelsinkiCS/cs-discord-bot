const { isDbAdmin, requireAdmin } = require("../../src/discordBot/services/permissions");
const { findUserByDiscordId } = require("../../src/db/services/userService");
const { sendErrorEphemeral } = require("../../src/discordBot/services/message");

jest.mock("../../src/db/services/userService");
jest.mock("../../src/discordBot/services/message");

const models = { User: {} };
const interaction = { user: { id: "42" } };

afterEach(() => {
  jest.clearAllMocks();
});

describe("isDbAdmin", () => {
  test("is true when the database user has the admin flag", async () => {
    findUserByDiscordId.mockImplementationOnce(() => ({ admin: true }));
    expect(await isDbAdmin("42", models)).toBe(true);
    expect(findUserByDiscordId).toHaveBeenCalledWith("42", models.User);
  });

  test("is false when the database user is not an admin", async () => {
    findUserByDiscordId.mockImplementationOnce(() => ({ admin: false }));
    expect(await isDbAdmin("42", models)).toBe(false);
  });

  test("is false when the user is not in the database", async () => {
    findUserByDiscordId.mockImplementationOnce(() => null);
    expect(await isDbAdmin("42", models)).toBe(false);
  });
});

describe("requireAdmin", () => {
  test("returns true without replying for admins", async () => {
    findUserByDiscordId.mockImplementationOnce(() => ({ admin: true }));
    expect(await requireAdmin(interaction, models)).toBe(true);
    expect(sendErrorEphemeral).toHaveBeenCalledTimes(0);
  });

  test("replies with an error and returns false for non-admins", async () => {
    findUserByDiscordId.mockImplementationOnce(() => ({ admin: false }));
    expect(await requireAdmin(interaction, models)).toBe(false);
    expect(sendErrorEphemeral).toHaveBeenCalledWith(interaction, "You do not have permission to use this command.");
  });
});

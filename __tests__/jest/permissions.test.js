const { isDbAdmin, isDbFaculty, requireAdmin, requireFaculty } = require("../../src/discordBot/services/permissions");
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

describe("isDbFaculty", () => {
  test("is true for a database user with the faculty flag", async () => {
    findUserByDiscordId.mockImplementationOnce(() => ({ admin: false, faculty: true }));
    expect(await isDbFaculty("42", models)).toBe(true);
    expect(findUserByDiscordId).toHaveBeenCalledWith("42", models.User);
  });

  test("is true for admins, who can use everything faculty can", async () => {
    findUserByDiscordId.mockImplementationOnce(() => ({ admin: true, faculty: false }));
    expect(await isDbFaculty("42", models)).toBe(true);
  });

  test("is false for a user with neither flag", async () => {
    findUserByDiscordId.mockImplementationOnce(() => ({ admin: false, faculty: false }));
    expect(await isDbFaculty("42", models)).toBe(false);
  });

  test("is false when the user is not in the database", async () => {
    findUserByDiscordId.mockImplementationOnce(() => null);
    expect(await isDbFaculty("42", models)).toBe(false);
  });
});

describe("requireFaculty", () => {
  test("returns true without replying for faculty", async () => {
    findUserByDiscordId.mockImplementationOnce(() => ({ faculty: true }));
    expect(await requireFaculty(interaction, models)).toBe(true);
    expect(sendErrorEphemeral).not.toHaveBeenCalled();
  });

  test("returns true without replying for admins", async () => {
    findUserByDiscordId.mockImplementationOnce(() => ({ admin: true }));
    expect(await requireFaculty(interaction, models)).toBe(true);
    expect(sendErrorEphemeral).not.toHaveBeenCalled();
  });

  test("replies with an error and returns false for everyone else", async () => {
    findUserByDiscordId.mockImplementationOnce(() => ({ admin: false, faculty: false }));
    expect(await requireFaculty(interaction, models)).toBe(false);
    expect(sendErrorEphemeral).toHaveBeenCalledWith(interaction, "You do not have permission to use this command.");
  });

  test("looks the user up by the interaction user, not the member", async () => {
    findUserByDiscordId.mockImplementationOnce(() => ({ faculty: true }));
    await requireFaculty({ user: { id: "7" }, member: { user: { id: "8" } } }, models);
    expect(findUserByDiscordId).toHaveBeenCalledWith("7", models.User);
  });
});

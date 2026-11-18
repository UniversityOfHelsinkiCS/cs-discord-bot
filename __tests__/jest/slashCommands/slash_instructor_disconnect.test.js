const { execute } = require("../../../src/discordBot/commands/instructor/instructor_disconnect");
const { getChannelByDiscordId } = require("../../../src/db/services/channelService");
const { findUserByDiscordId } = require("../../../src/db/services/userService");
const { findCourseMember } = require("../../../src/db/services/courseMemberService");
const { getUserWithUserId } = require("../../../src/discordBot/services/service");
const { confirmChoice } = require("../../../src/discordBot/services/confirm");
const { editEphemeral, editErrorEphemeral } = require("../../../src/discordBot/services/message");
const models = require("../../mocks/mockModels");

jest.mock("../../../src/db/services/channelService");
jest.mock("../../../src/db/services/userService");
jest.mock("../../../src/db/services/courseMemberService");
jest.mock("../../../src/discordBot/services/service");
jest.mock("../../../src/discordBot/services/confirm");
jest.mock("../../../src/discordBot/services/message");

const disconnect = jest.fn();
const target = { voice: { channelId: "voice-1", disconnect } };
const client = { guild: {} };

const buildInteraction = (user = "<@200>") => ({
  user: { id: "100" },
  options: { getString: () => user }
});

beforeEach(() => {
  jest.clearAllMocks();
  getUserWithUserId.mockResolvedValue(target);
  getChannelByDiscordId.mockResolvedValue({ courseId: 7 });
  findUserByDiscordId.mockResolvedValue({ id: 1, admin: false, faculty: false });
  findCourseMember.mockResolvedValue({ instructor: true });
  confirmChoice.mockResolvedValue(true);
});

describe("slash instructor_disconnect command", () => {
  test.each(["<@200>", "<@!200>"])("a course instructor can disconnect %s", async (mention) => {
    const interaction = buildInteraction(mention);
    await execute(interaction, client, models);
    expect(getUserWithUserId).toHaveBeenCalledWith(client.guild, "200");
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(editEphemeral).toHaveBeenCalledWith(interaction, `Disconnected user ${mention} from voice channel`);
  });

  test("text that is not a mention is rejected", async () => {
    const interaction = buildInteraction("someone");
    await execute(interaction, client, models);
    expect(editErrorEphemeral).toHaveBeenCalledWith(interaction, "Invalid parameters.");
    expect(disconnect).not.toHaveBeenCalled();
  });

  test("a user who is not in voice is reported", async () => {
    getUserWithUserId.mockResolvedValueOnce({ voice: { channelId: null } });
    const interaction = buildInteraction();
    await execute(interaction, client, models);
    expect(editErrorEphemeral).toHaveBeenCalledWith(interaction, "That user is not in a voice channel.");
  });

  test("a user without a record is refused instead of crashing", async () => {
    findUserByDiscordId.mockResolvedValueOnce(null);
    const interaction = buildInteraction();
    await execute(interaction, client, models);
    expect(editErrorEphemeral).toHaveBeenCalledWith(interaction, "You don't have the permissions to do that.");
    expect(disconnect).not.toHaveBeenCalled();
  });

  test("a student who is not on the course is refused instead of crashing", async () => {
    findCourseMember.mockResolvedValueOnce(null);
    const interaction = buildInteraction();
    await execute(interaction, client, models);
    expect(editErrorEphemeral).toHaveBeenCalledWith(interaction, "You don't have the permissions to do that.");
  });

  test("only faculty and admins can disconnect from a non-course voice channel", async () => {
    getChannelByDiscordId.mockResolvedValue(null);
    await execute(buildInteraction(), client, models);
    expect(disconnect).not.toHaveBeenCalled();

    findUserByDiscordId.mockResolvedValueOnce({ id: 1, faculty: true });
    await execute(buildInteraction(), client, models);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  test("nothing happens when declined", async () => {
    confirmChoice.mockResolvedValueOnce(false);
    await execute(buildInteraction(), client, models);
    expect(disconnect).not.toHaveBeenCalled();
  });
});

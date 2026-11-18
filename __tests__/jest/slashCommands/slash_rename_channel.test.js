const { execute } = require("../../../src/discordBot/commands/faculty/rename_channel");
const {
  findChannelFromDbByDiscordId,
  editChannelName,
  findChannelFromDbByName
} = require("../../../src/db/services/channelService");
const { findCourseFromDb } = require("../../../src/db/services/courseService");
const { requireFaculty } = require("../../../src/discordBot/services/permissions");
const { getCourseNameFromCategory } = require("../../../src/discordBot/services/service");
const { confirmChoice } = require("../../../src/discordBot/services/confirm");
const { editErrorEphemeral } = require("../../../src/discordBot/services/message");
const models = require("../../mocks/mockModels");

jest.mock("../../../src/db/services/channelService");
jest.mock("../../../src/db/services/courseService");
jest.mock("../../../src/discordBot/services/permissions");
jest.mock("../../../src/discordBot/services/service");
jest.mock("../../../src/discordBot/services/confirm");
jest.mock("../../../src/discordBot/services/message");

const interaction = {
  channelId: "channel-1",
  options: { getString: () => "critique" }
};
const client = {
  guild: { channels: { cache: { get: () => ({ parent: { name: "📚 wepa" } }) } } }
};

beforeEach(() => {
  jest.clearAllMocks();
  requireFaculty.mockResolvedValue(true);
  getCourseNameFromCategory.mockReturnValue("wepa");
  findCourseFromDb.mockResolvedValue({ id: 1, name: "wepa" });
  findChannelFromDbByName.mockResolvedValue(null);
  confirmChoice.mockResolvedValue(true);
});

describe("slash rename_channel command", () => {
  test("renames a channel added with /create_channel", async () => {
    findChannelFromDbByDiscordId.mockResolvedValue({
      name: "wepa_feedback",
      discordId: "channel-1",
      defaultChannel: false
    });
    await execute(interaction, client, models);
    expect(editChannelName).toHaveBeenCalledWith("channel-1", "wepa_critique", models.Channel);
  });

  test("refuses to rename a default course channel", async () => {
    findChannelFromDbByDiscordId.mockResolvedValue({
      name: "wepa_announcement",
      discordId: "channel-1",
      defaultChannel: true
    });
    await execute(interaction, client, models);
    expect(editChannelName).not.toHaveBeenCalled();
    expect(confirmChoice).not.toHaveBeenCalled();
    expect(editErrorEphemeral).toHaveBeenCalledWith(interaction, "Default course channels can't be renamed.");
  });
});

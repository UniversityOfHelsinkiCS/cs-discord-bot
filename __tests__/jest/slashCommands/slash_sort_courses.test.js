const { execute } = require("../../../src/discordBot/commands/admin/sort_courses");
const { findCategoryWithCourseName } = require("../../../src/discordBot/services/service");
const { findAllCourseNames } = require("../../../src/db/services/courseService");
const { requireAdmin } = require("../../../src/discordBot/services/permissions");

jest.mock("../../../src/db/services/courseService");
jest.mock("../../../src/discordBot/services/service");
jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/permissions");

const { defaultAdminInteraction } = require("../../mocks/mockInteraction");
const models = require("../../mocks/mockModels");

requireAdmin.mockImplementation(() => true);

afterEach(() => {
  jest.clearAllMocks();
});

const setUpCategories = (client) => {
  const channelA = { name: "📚 a", type: "GUILD_CATEGORY", edit: jest.fn(), position: 2 };
  const channelB = { name: "📚 b", type: "GUILD_CATEGORY", edit: jest.fn(), position: 1 };
  client.guild.channels.cache.set(1, channelB);
  client.guild.channels.cache.set(2, channelA);
  return { channelA, channelB };
};

describe("slash sort courses command", () => {
  test("admin can sort courses manually", async () => {
    const client = defaultAdminInteraction.client;
    const { channelA, channelB } = setUpCategories(client);
    findAllCourseNames.mockImplementationOnce(() => ["b", "a"]);
    findCategoryWithCourseName.mockImplementationOnce(() => client.guild.channels.cache.get(1));
    findCategoryWithCourseName.mockImplementationOnce(() => client.guild.channels.cache.get(2));
    await execute(defaultAdminInteraction, client, models);
    expect(findAllCourseNames).toHaveBeenCalledTimes(1);
    expect(findCategoryWithCourseName).toHaveBeenCalledTimes(2);
    expect(channelA.edit).toHaveBeenCalledTimes(1);
    expect(channelB.edit).toHaveBeenCalledTimes(1);
    client.guild.channels.init();
  });

  test("non-admin cannot use sort command", async () => {
    const client = defaultAdminInteraction.client;
    const { channelA, channelB } = setUpCategories(client);
    requireAdmin.mockImplementationOnce(() => false);
    await execute(defaultAdminInteraction, client, models);
    expect(findAllCourseNames).toHaveBeenCalledTimes(0);
    expect(findCategoryWithCourseName).toHaveBeenCalledTimes(0);
    expect(channelA.edit).toHaveBeenCalledTimes(0);
    expect(channelB.edit).toHaveBeenCalledTimes(0);
    client.guild.channels.init();
  });
});

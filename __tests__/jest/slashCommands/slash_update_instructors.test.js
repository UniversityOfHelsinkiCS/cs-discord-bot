const { execute } = require("../../../src/discordBot/commands/admin/update_instructors");
const { findAndUpdateInstructorRole } = require("../../../src/discordBot/services/service");
const { findAllCourseNames } = require("../../../src/db/services/courseService");
const { requireAdmin } = require("../../../src/discordBot/services/permissions");
const { courseAdminRole } = require("../../../config.json");

jest.mock("../../../src/discordBot/services/service");
jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/permissions");
jest.mock("../../../src/db/services/courseService");

const { defaultAdminInteraction } = require("../../mocks/mockInteraction");
const models = require("../../mocks/mockModels");

const courseString = "test";

requireAdmin.mockImplementation(() => true);
findAllCourseNames.mockImplementation(() => [courseString]);

afterEach(() => {
  jest.clearAllMocks();
});

describe("slash update_instructors command", () => {
  test("non-admin cannot update roles", async () => {
    requireAdmin.mockImplementationOnce(() => false);
    await execute(defaultAdminInteraction, defaultAdminInteraction.client, models);
    expect(findAllCourseNames).toHaveBeenCalledTimes(0);
    expect(findAndUpdateInstructorRole).toHaveBeenCalledTimes(0);
  });

  test("admin can update roles", async () => {
    const client = defaultAdminInteraction.client;
    await execute(defaultAdminInteraction, client, models);
    expect(findAllCourseNames).toHaveBeenCalledTimes(1);
    expect(findAllCourseNames).toHaveBeenCalledWith(models.Course);
    expect(findAndUpdateInstructorRole).toHaveBeenCalledTimes(1);
    expect(findAndUpdateInstructorRole).toHaveBeenCalledWith(courseString, client.guild, courseAdminRole);
  });
});

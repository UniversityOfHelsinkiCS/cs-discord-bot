const { execute } = require("../../../src/discordBot/commands/admin/delete_course");
const { findCourseFromDb, removeCourseFromDb } = require("../../../src/db/services/courseService");
const { confirmChoice } = require("../../../src/discordBot/services/confirm");
const { requireAdmin } = require("../../../src/discordBot/services/permissions");
const { sendEphemeral, editEphemeral, editErrorEphemeral } = require("../../../src/discordBot/services/message");

jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/confirm");
jest.mock("../../../src/discordBot/services/permissions");
jest.mock("../../../src/db/services/courseService");

const { defaultAdminInteraction } = require("../../mocks/mockInteraction");
const models = require("../../mocks/mockModels");

let courseName = "test";
defaultAdminInteraction.options = { getString: jest.fn(() => courseName) };

requireAdmin.mockImplementation(() => true);
confirmChoice.mockImplementation(() => true);
findCourseFromDb.mockImplementation((name) => ({ name }));

afterEach(() => {
  jest.clearAllMocks();
  courseName = "test";
});

describe("slash delete_course", () => {
  test("Only admins can use delete_course", async () => {
    requireAdmin.mockImplementationOnce(() => false);
    await execute(defaultAdminInteraction, defaultAdminInteraction.client, models);
    expect(sendEphemeral).toHaveBeenCalledTimes(0);
    expect(removeCourseFromDb).toHaveBeenCalledTimes(0);
  });

  test("invalid course name responds with an error", async () => {
    courseName = "invalidName";
    findCourseFromDb.mockImplementationOnce(() => null);
    await execute(defaultAdminInteraction, defaultAdminInteraction.client, models);
    expect(confirmChoice).toHaveBeenCalledTimes(1);
    expect(removeCourseFromDb).toHaveBeenCalledTimes(0);
    expect(editErrorEphemeral).toHaveBeenCalledTimes(1);
    expect(editErrorEphemeral).toHaveBeenCalledWith(defaultAdminInteraction, `Invalid course name: ${courseName}.`);
  });

  test("Does nothing if command is declined", async () => {
    confirmChoice.mockImplementationOnce(() => false);
    await execute(defaultAdminInteraction, defaultAdminInteraction.client, models);
    expect(confirmChoice).toHaveBeenCalledTimes(1);
    expect(removeCourseFromDb).toHaveBeenCalledTimes(0);
  });

  test("valid course name removes the course", async () => {
    const client = defaultAdminInteraction.client;
    await execute(defaultAdminInteraction, client, models);
    expect(confirmChoice).toHaveBeenCalledTimes(1);
    expect(removeCourseFromDb).toHaveBeenCalledTimes(1);
    expect(removeCourseFromDb).toHaveBeenCalledWith(courseName, models.Course);
    expect(editEphemeral).toHaveBeenCalledWith(defaultAdminInteraction, `Deleted course ${courseName}.`);
  });
});

const { execute, autocomplete, data } = require("../../../src/discordBot/commands/admin/delete_course");
const { findCourseFromDb, findCoursesFromDb, removeCourseFromDb } = require("../../../src/db/services/courseService");
const { confirmChoice } = require("../../../src/discordBot/services/confirm");
const { requireAdmin } = require("../../../src/discordBot/services/permissions");
const { sendEphemeral, editEphemeral, editErrorEphemeral } = require("../../../src/discordBot/services/message");

jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/confirm");
jest.mock("../../../src/discordBot/services/permissions");
jest.mock("../../../src/discordBot/services/autocomplete");
const { respondWithCourses } = require("../../../src/discordBot/services/autocomplete");
jest.mock("../../../src/db/services/courseService");
jest.mock("../../../src/db/services/courseMemberService");
jest.mock("../../../src/db/services/userService");
const { findAllCourseMembers } = require("../../../src/db/services/courseMemberService");
const { removeUserIfUnused } = require("../../../src/db/services/userService");

const { defaultAdminInteraction } = require("../../mocks/mockInteraction");
const models = require("../../mocks/mockModels");

let courseName = "test";
defaultAdminInteraction.options = { getString: jest.fn(() => courseName) };

requireAdmin.mockImplementation(() => true);
confirmChoice.mockImplementation(() => true);
findCourseFromDb.mockImplementation((name) => ({ id: 1, name }));
findAllCourseMembers.mockImplementation(() => []);

afterEach(() => {
  jest.clearAllMocks();
  courseName = "test";
});

describe("slash delete_course", () => {
  test("Only admins can use delete_course", async () => {
    requireAdmin.mockImplementationOnce(() => false);
    await execute(defaultAdminInteraction, defaultAdminInteraction.client, models);
    expect(sendEphemeral).toHaveBeenCalledTimes(1);
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

  test("removes the records of members left with nothing after the course is deleted", async () => {
    const order = [];
    findAllCourseMembers.mockImplementationOnce(() => [{ userId: 3 }, { userId: 4 }]);
    removeCourseFromDb.mockImplementationOnce(() => order.push("course"));
    removeUserIfUnused.mockImplementation((userId) => order.push(userId));
    await execute(defaultAdminInteraction, defaultAdminInteraction.client, models);
    expect(findAllCourseMembers).toHaveBeenCalledWith(1, models.CourseMember);
    expect(removeUserIfUnused).toHaveBeenCalledWith(3, models.User, models.CourseMember);
    expect(removeUserIfUnused).toHaveBeenCalledWith(4, models.User, models.CourseMember);
    expect(order).toEqual(["course", 3, 4]);
  });
});

describe("slash delete_course autocomplete", () => {
  test("the course option is autocompleted", () => {
    expect(data.toJSON().options[0].autocomplete).toBe(true);
  });

  test("offers every course ordered by full name", async () => {
    const courses = [{ id: 1, code: "a", fullName: "A", name: "a" }];
    findCoursesFromDb.mockResolvedValueOnce(courses);
    await autocomplete(defaultAdminInteraction, defaultAdminInteraction.client, models);
    expect(findCoursesFromDb).toHaveBeenCalledWith("fullName", models.Course);
    expect(respondWithCourses).toHaveBeenCalledWith(defaultAdminInteraction, courses);
  });
});

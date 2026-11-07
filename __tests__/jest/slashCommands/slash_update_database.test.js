const { Collection } = require("discord.js");
const { execute } = require("../../../src/discordBot/commands/admin/update_database");
const { createUserToDatabase, findUserByDiscordId } = require("../../../src/db/services/userService");
const { createCourseMemberToDatabase } = require("../../../src/db/services/courseMemberService");
const { findCourseFromDb } = require("../../../src/db/services/courseService");
const { isCourseCategory, getCourseNameFromCategory } = require("../../../src/discordBot/services/service");
const { requireAdmin } = require("../../../src/discordBot/services/permissions");
const { facultyRole } = require("../../../config.json");
const models = require("../../mocks/mockModels");

jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/permissions");
jest.mock("../../../src/discordBot/services/service");
jest.mock("../../../src/db/services/userService");
jest.mock("../../../src/db/services/courseService");
jest.mock("../../../src/db/services/courseMemberService");
jest.mock("../../../src/db/services/channelService");

const roles = new Collection([
  ["role-admin", { id: "role-admin", name: "admin" }],
  ["role-faculty", { id: "role-faculty", name: facultyRole }],
  ["role-course", { id: "role-course", name: "test" }],
  ["role-instructor", { id: "role-instructor", name: "test instructor" }]
]);

const buildMember = (id, roleIds) => [
  id,
  {
    user: { id, username: id, bot: false },
    roles: { cache: new Collection(roleIds.map((roleId) => [roleId, roles.get(roleId)])) }
  }
];

const buildClient = (members) => ({
  guild: {
    channels: {
      cache: new Collection(),
      fetch: jest.fn(() => new Collection([["category", { name: "📚 test" }]]))
    },
    roles: { fetch: jest.fn(() => roles) },
    members: { fetch: jest.fn(() => new Collection(members)) }
  }
});

const savedRecord = () => ({ id: 1, save: jest.fn() });

beforeEach(() => {
  jest.clearAllMocks();
  requireAdmin.mockImplementation(() => true);
  isCourseCategory.mockImplementation(() => true);
  getCourseNameFromCategory.mockImplementation(() => "test");
  findCourseFromDb.mockImplementation(() => ({ id: 5 }));
  createUserToDatabase.mockImplementation(() => savedRecord());
  findUserByDiscordId.mockImplementation(() => null);
  createCourseMemberToDatabase.mockImplementation(() => savedRecord());
});

describe("slash update_database command", () => {
  test("members without course or staff roles get no record", async () => {
    await execute({}, buildClient([buildMember("plain", [])]), models);
    expect(createUserToDatabase).not.toHaveBeenCalled();
    expect(createCourseMemberToDatabase).not.toHaveBeenCalled();
  });

  test("staff members get a record with their flags", async () => {
    const record = savedRecord();
    createUserToDatabase.mockImplementation(() => record);
    await execute({}, buildClient([buildMember("staff", ["role-admin"])]), models);
    expect(createUserToDatabase).toHaveBeenCalledWith("staff", "staff", models.User);
    expect(record.admin).toBe(true);
    expect(record.faculty).toBe(false);
    expect(record.save).toHaveBeenCalled();
  });

  test("course members get a record and a course membership", async () => {
    await execute({}, buildClient([buildMember("student", ["role-course"])]), models);
    expect(createUserToDatabase).toHaveBeenCalledWith("student", "student", models.User);
    expect(createCourseMemberToDatabase).toHaveBeenCalledWith(1, 5, models.CourseMember);
  });

  test("an existing record loses staff flags when the roles are gone", async () => {
    const record = { ...savedRecord(), admin: true, faculty: true };
    findUserByDiscordId.mockImplementation(() => record);
    await execute({}, buildClient([buildMember("former", [])]), models);
    expect(createUserToDatabase).not.toHaveBeenCalled();
    expect(record.admin).toBe(false);
    expect(record.faculty).toBe(false);
    expect(record.save).toHaveBeenCalled();
  });
});

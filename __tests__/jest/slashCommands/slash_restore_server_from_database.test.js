const {
  restoreUsers,
  restorePermissions
} = require("../../../src/discordBot/commands/admin/restore_server_from_database");
const { getAllCourses } = require("../../../src/db/services/courseService");
const { getAllUsers } = require("../../../src/db/services/userService");
const { courseAdminRole, facultyRole } = require("../../../config.json");

jest.mock("../../../src/db/services/courseService");
jest.mock("../../../src/db/services/userService");
jest.mock("../../../src/db/services/channelService");
jest.mock("../../../src/db/services/courseMemberService");
jest.mock("../../../src/discordBot/services/service");
jest.mock("../../../src/discordBot/services/guide");

const roleList = (names) => {
  const roles = names.map((name) => ({ name }));
  return {
    find: (fn) => roles.find(fn),
    filter: (fn) => {
      const matching = roles.filter(fn);
      return Object.assign(matching, { size: matching.length });
    }
  };
};

const models = { User: {}, Course: {} };

beforeEach(() => {
  jest.clearAllMocks();
  getAllCourses.mockResolvedValue([{ name: "wepa", locked: true, categoryId: "category-1" }]);
});

describe("restoreUsers", () => {
  test("only removes roles the bot manages", async () => {
    const remove = jest.fn();
    const add = jest.fn();
    const member = {
      roles: { cache: roleList(["wepa", `wepa ${courseAdminRole}`, "cs-admin", facultyRole]), remove, add }
    };
    getAllUsers.mockResolvedValue([{ discordId: "user-1", admin: false, faculty: true }]);
    const guild = {
      roles: { cache: roleList(["admin", facultyRole]) },
      members: { cache: { get: () => member } }
    };

    await restoreUsers(guild, models);

    const removedNames = remove.mock.calls[0][0].map((r) => r.name);
    expect(removedNames).toEqual(["wepa", `wepa ${courseAdminRole}`, facultyRole]);
    expect(add).toHaveBeenCalledWith({ name: facultyRole });
  });
});

describe("restorePermissions", () => {
  test("lets instructors, faculty and admins post in locked courses", async () => {
    const create = jest.fn();
    const guild = {
      roles: { cache: roleList(["wepa", `wepa ${courseAdminRole}`, facultyRole, "admin"]) },
      channels: { cache: { get: () => ({ permissionOverwrites: { create } }) } }
    };

    await restorePermissions(guild, models);

    const overwrites = Object.fromEntries(create.mock.calls.map(([role, overwrite]) => [role.name, overwrite]));
    expect(overwrites).toEqual({
      wepa: { ViewChannel: true, SendMessages: false },
      [`wepa ${courseAdminRole}`]: { SendMessages: true },
      [facultyRole]: { SendMessages: true },
      admin: { SendMessages: true }
    });
  });
});

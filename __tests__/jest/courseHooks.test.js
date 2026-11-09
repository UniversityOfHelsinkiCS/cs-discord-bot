const { initCourseHooks } = require("../../src/db/hooks/courseHooks");
const { findCategoryWithCourseName } = require("../../src/discordBot/services/service");
const { courseAdminRole, facultyRole } = require("../../config.json");

jest.mock("../../src/discordBot/services/service");
jest.mock("../../src/discordBot/services/guide");
jest.mock("../../src/db/services/channelService");

const roleNames = ["wepa", `wepa ${courseAdminRole}`, facultyRole, "admin"];
const roles = roleNames.map((name) => ({ name }));
const guild = { roles: { cache: { find: (fn) => roles.find(fn) } } };

const hooks = {};
const models = { Course: { addHook: (name, fn) => (hooks[name] = fn) } };
initCourseHooks(guild, models);

const create = jest.fn();
findCategoryWithCourseName.mockReturnValue({ permissionOverwrites: { create } });

const buildCourseUpdate = (locked) => ({
  name: "wepa",
  locked,
  private: false,
  _options: { isNewRecord: false },
  _changed: new Set(["locked"]),
  _previousDataValues: { name: "wepa" }
});

const overwriteFor = (roleName) => create.mock.calls.find(([role]) => role.name === roleName)?.[1];

beforeEach(() => {
  create.mockClear();
});

describe("course lock hook", () => {
  test("locking stops students but lets instructors, faculty and admins post", async () => {
    await hooks.afterUpdate(buildCourseUpdate(true));

    expect(overwriteFor("wepa")).toEqual({ ViewChannel: true, SendMessages: false });
    expect(overwriteFor(`wepa ${courseAdminRole}`)).toEqual({ SendMessages: true });
    expect(overwriteFor(facultyRole)).toEqual({ SendMessages: true });
    expect(overwriteFor("admin")).toEqual({ SendMessages: true });
  });

  test("unlocking lets students post again", async () => {
    await hooks.afterUpdate(buildCourseUpdate(false));

    expect(overwriteFor("wepa")).toEqual({ ViewChannel: true, SendMessages: true });
  });
});

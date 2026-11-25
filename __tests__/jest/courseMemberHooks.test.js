const { initCourseMemberHooks } = require("../../src/db/hooks/courseMemberHooks");
const { findUserByDbId } = require("../../src/db/services/userService");
const { findCourseFromDbById } = require("../../src/db/services/courseService");
const { updateAnnouncementChannelMessage } = require("../../src/discordBot/services/service");
const { courseAdminRole } = require("../../config.json");

jest.mock("../../src/discordBot/services/service");
jest.mock("../../src/discordBot/services/logger");
jest.mock("../../src/db/services/userService");
jest.mock("../../src/db/services/courseService");

const courseRole = { name: "wepa" };
const instructorRole = { name: `wepa ${courseAdminRole}` };
const otherCourseRole = { name: "ohpe" };

const buildMember = (roles) => ({
  roles: { cache: { find: (fn) => roles.find(fn) }, remove: jest.fn() }
});

const hooks = {};
const models = { CourseMember: { addHook: (name, fn) => (hooks[name] = fn) } };
const guild = { members: { fetch: jest.fn() }, channels: { cache: { find: jest.fn() } } };
initCourseMemberHooks(guild, models);

const leaveCourse = () => hooks.afterBulkDestroy({ where: { userId: 1, courseId: 2 } });

beforeEach(() => {
  jest.clearAllMocks();
  findUserByDbId.mockResolvedValue({ discordId: "discord-1" });
  findCourseFromDbById.mockResolvedValue({ name: "wepa" });
});

describe("course member removal hook", () => {
  test("removes only the course role", async () => {
    const member = buildMember([otherCourseRole, courseRole, instructorRole]);
    guild.members.fetch.mockResolvedValue(member);
    await leaveCourse();
    expect(member.roles.remove).toHaveBeenCalledTimes(1);
    expect(member.roles.remove).toHaveBeenCalledWith(courseRole);
  });

  test("does not refresh the instructor list", async () => {
    guild.members.fetch.mockResolvedValue(buildMember([courseRole]));
    await leaveCourse();
    expect(updateAnnouncementChannelMessage).not.toHaveBeenCalled();
  });

  test("does nothing when the member is no longer on the server", async () => {
    guild.members.fetch.mockRejectedValue(new Error("Unknown Member"));
    await expect(leaveCourse()).resolves.toBeUndefined();
  });
});

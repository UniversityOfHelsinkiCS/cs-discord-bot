const { execute } = require("../../../src/discordBot/commands/admin/fix_course_roles");
const { getAllCourses } = require("../../../src/db/services/courseService");
const { findUserByDiscordId, findUserByDbId, createUserToDatabase } = require("../../../src/db/services/userService");
const {
  findCourseMember,
  findAllCourseMembers,
  createCourseMemberToDatabase,
  removeCourseMemberFromDb
} = require("../../../src/db/services/courseMemberService");
const { requireAdmin } = require("../../../src/discordBot/services/permissions");
const { sendEphemeral, replyInChunks } = require("../../../src/discordBot/services/message");
const models = require("../../mocks/mockModels");

jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/permissions");
jest.mock("../../../src/db/services/courseService");
jest.mock("../../../src/db/services/userService");
jest.mock("../../../src/db/services/courseMemberService");

const courseRole = { id: "role-course", name: "test" };
const instructorRole = { id: "role-instructor", name: "test instructor" };
const interaction = {};

const buildClient = (member) => ({
  guild: {
    roles: { cache: { find: (fn) => [courseRole, instructorRole].find(fn) }, fetch: jest.fn() },
    members: { fetch: jest.fn(() => new Map([[member.id, member]])) }
  }
});

const buildMember = (roleIds) => ({
  id: "discord-1",
  user: { id: "discord-1", username: "alice", bot: false },
  roles: { cache: new Set(roleIds), add: jest.fn() }
});

beforeEach(() => {
  jest.clearAllMocks();
  requireAdmin.mockImplementation(() => true);
  getAllCourses.mockImplementation(() => [{ id: 1, name: "test" }]);
  findUserByDiscordId.mockImplementation(() => ({ id: 10 }));
  findAllCourseMembers.mockImplementation(() => []);
});

describe("slash fix_course_roles command", () => {
  test("does nothing for non-admins", async () => {
    requireAdmin.mockImplementationOnce(() => false);
    const member = buildMember([instructorRole.id]);
    await execute(interaction, buildClient(member), models);
    expect(sendEphemeral).toHaveBeenCalledTimes(0);
    expect(getAllCourses).toHaveBeenCalledTimes(0);
    expect(member.roles.add).toHaveBeenCalledTimes(0);
  });

  test("adds the course role and course membership for an instructor-only member", async () => {
    const member = buildMember([instructorRole.id]);
    const courseMember = { instructor: false, save: jest.fn() };
    findCourseMember.mockImplementation(() => null);
    createCourseMemberToDatabase.mockImplementation(() => courseMember);

    await execute(interaction, buildClient(member), models);

    expect(member.roles.add).toHaveBeenCalledWith(courseRole);
    expect(createCourseMemberToDatabase).toHaveBeenCalledWith(10, 1, models.CourseMember);
    expect(courseMember.instructor).toBe(true);
    expect(courseMember.save).toHaveBeenCalledTimes(1);
    expect(replyInChunks).toHaveBeenCalledTimes(1);
  });

  test("clears the instructor flag when the instructor role is gone", async () => {
    const member = buildMember([courseRole.id]);
    const courseMember = { instructor: true, save: jest.fn() };
    findCourseMember.mockImplementation(() => courseMember);

    await execute(interaction, buildClient(member), models);

    expect(member.roles.add).toHaveBeenCalledTimes(0);
    expect(courseMember.instructor).toBe(false);
    expect(courseMember.save).toHaveBeenCalledTimes(1);
  });

  test("removes the database entry for a member with no course roles", async () => {
    const member = buildMember([]);
    findAllCourseMembers.mockImplementation(() => [{ userId: 10, courseId: 1, instructor: false }]);
    findUserByDbId.mockImplementation(() => ({ discordId: "discord-1" }));

    await execute(interaction, buildClient(member), models);

    expect(removeCourseMemberFromDb).toHaveBeenCalledWith(10, 1, models.CourseMember);
    expect(replyInChunks).toHaveBeenCalledTimes(1);
  });

  test("leaves a consistent member untouched", async () => {
    const member = buildMember([courseRole.id]);
    findCourseMember.mockImplementation(() => ({ instructor: false, save: jest.fn() }));

    await execute(interaction, buildClient(member), models);

    expect(member.roles.add).toHaveBeenCalledTimes(0);
    expect(createCourseMemberToDatabase).toHaveBeenCalledTimes(0);
    expect(createUserToDatabase).toHaveBeenCalledTimes(0);
    expect(removeCourseMemberFromDb).toHaveBeenCalledTimes(0);
    expect(replyInChunks).toHaveBeenCalledWith(interaction, "No course role mismatches found.");
  });
});

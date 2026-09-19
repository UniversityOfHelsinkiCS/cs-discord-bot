const courseService = require("../../../src/db/services/courseService");
const { findUserByDiscordId } = require("../../../src/db/services/userService");
const { findAllCourseMembersByUser } = require("../../../src/db/services/courseMemberService");
const { respondWithCourses } = require("../../../src/discordBot/services/autocomplete");

jest.mock("../../../src/db/services/courseService");
jest.mock("../../../src/db/services/userService");
jest.mock("../../../src/db/services/courseMemberService");
jest.mock("../../../src/discordBot/services/autocomplete");
jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/permissions");
jest.mock("../../../src/discordBot/services/service");
jest.mock("../../../src/discordBot/services/confirm");

const join = require("../../../src/discordBot/commands/student/join");
const leave = require("../../../src/discordBot/commands/student/leave");
const hideCourse = require("../../../src/discordBot/commands/faculty/hide_course");
const unhideCourse = require("../../../src/discordBot/commands/faculty/unhide_course");
const lockChat = require("../../../src/discordBot/commands/faculty/lock_chat");
const unlockChat = require("../../../src/discordBot/commands/faculty/unlock_chat");

const models = { Course: {}, User: {}, CourseMember: {} };
const interaction = { user: { id: "u1" } };
const client = {};
const courses = [
  { id: 1, code: "a", fullName: "A", name: "a" },
  { id: 2, code: "b", fullName: "B", name: "b" }
];

afterEach(() => {
  jest.clearAllMocks();
});

describe.each([
  ["join", join, "findPublicCoursesFromDb"],
  ["hide_course", hideCourse, "findPublicCoursesFromDb"],
  ["unhide_course", unhideCourse, "findPrivateCoursesFromDb"],
  ["lock_chat", lockChat, "findUnlockedCoursesFromDb"],
  ["unlock_chat", unlockChat, "findLockedCoursesFromDb"]
])("%s autocomplete", (name, command, finder) => {
  test("the course option is autocompleted", () => {
    expect(command.data.toJSON().options[0].autocomplete).toBe(true);
  });

  test(`offers the courses from ${finder}`, async () => {
    courseService[finder].mockResolvedValueOnce(courses);
    await command.autocomplete(interaction, client, models);
    expect(courseService[finder]).toHaveBeenCalledWith("fullName", models.Course);
    expect(respondWithCourses).toHaveBeenCalledWith(interaction, courses);
  });
});

describe("leave autocomplete", () => {
  test("the course option is autocompleted", () => {
    expect(leave.data.toJSON().options[0].autocomplete).toBe(true);
  });

  test("offers only the courses the user is on", async () => {
    findUserByDiscordId.mockResolvedValueOnce({ id: 10 });
    findAllCourseMembersByUser.mockResolvedValueOnce([{ courseId: 2 }]);
    courseService.findCoursesFromDb.mockResolvedValueOnce(courses);
    await leave.autocomplete(interaction, client, models);
    expect(findUserByDiscordId).toHaveBeenCalledWith("u1", models.User);
    expect(findAllCourseMembersByUser).toHaveBeenCalledWith(10, models.CourseMember);
    expect(respondWithCourses).toHaveBeenCalledWith(interaction, [courses[1]]);
  });

  test("offers nothing to a user who is not in the database", async () => {
    findUserByDiscordId.mockResolvedValueOnce(null);
    courseService.findCoursesFromDb.mockResolvedValueOnce(courses);
    await leave.autocomplete(interaction, client, models);
    expect(findAllCourseMembersByUser).not.toHaveBeenCalled();
    expect(respondWithCourses).toHaveBeenCalledWith(interaction, []);
  });
});

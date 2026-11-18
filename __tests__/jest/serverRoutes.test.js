const express = require("express");
const supertest = require("supertest");
const passport = require("passport");
const { getRoles, getMember, addRole } = require("../../src/server/api/api");
const { findCourseFromDb } = require("../../src/db/services/courseService");
const { createUserToDatabase, saveFacultyRoleToDb } = require("../../src/db/services/userService");
const { createCourseMemberToDatabase } = require("../../src/db/services/courseMemberService");

jest.mock("../../src/db/dbInit", () => ({ Course: {}, User: {}, CourseMember: {} }));
jest.mock("../../src/server/api/api");
jest.mock("../../src/db/services/courseService");
jest.mock("../../src/db/services/userService");
jest.mock("../../src/db/services/courseMemberService");

const roles = [
  { id: "role-course", name: "wepa" },
  { id: "role-faculty", name: "faculty" },
  { id: "role-admin", name: "admin" },
  { id: "role-instructor", name: "wepa instructor" }
];

let loginState = {};
const authenticate = jest
  .spyOn(passport, "authenticate")
  .mockImplementation((strategy, options) => (req, res, next) => {
    if (options?.state) return res.status(302).json(options.state);
    req.user = { id: "discord-1", username: "student" };
    req.authInfo = { state: loginState };
    return next();
  });

const buildApp = () => {
  const app = express();
  app.use("/join", require("../../src/server/routes/join"));
  app.use("/discordAuth", require("../../src/server/routes/discordAuth"));
  return supertest(app);
};

const api = buildApp();

beforeEach(() => {
  jest.clearAllMocks();
  getRoles.mockResolvedValue(roles);
  getMember.mockResolvedValue({ user: { id: "discord-1" } });
  createUserToDatabase.mockResolvedValue({ id: 1, discordId: "discord-1" });
  findCourseFromDb.mockImplementation(async (name) => (name === "wepa" ? { id: 5, name: "wepa" } : null));
});

describe("course join link", () => {
  test("a course link starts the Discord login for that course role", async () => {
    const response = await api.get("/join/wepa").expect(302);
    expect(response.body).toEqual({ roleID: "role-course" });
  });

  test.each(["faculty", "admin", "wepa instructor", "unknown"])("a link to %s is rejected", async (name) => {
    await api.get(`/join/${encodeURIComponent(name)}`).expect(400);
    expect(authenticate).not.toHaveBeenCalledWith("discord", expect.objectContaining({ state: expect.anything() }));
  });
});

describe("Discord login callback", () => {
  test("a course login gives the course role and membership but no faculty rights", async () => {
    loginState = { roleID: "role-course" };
    await api.get("/discordAuth").expect(302);
    expect(addRole).toHaveBeenCalledWith({ id: "discord-1" }, roles[0]);
    expect(createCourseMemberToDatabase).toHaveBeenCalledWith(1, 5, {});
    expect(saveFacultyRoleToDb).not.toHaveBeenCalled();
  });

  test("a login with the faculty role but without the faculty flow gets no faculty rights", async () => {
    loginState = { roleID: "role-faculty" };
    await api.get("/discordAuth").expect(302);
    expect(saveFacultyRoleToDb).not.toHaveBeenCalled();
  });

  test("the faculty login saves faculty rights", async () => {
    loginState = { roleID: "role-faculty", faculty: true };
    await api.get("/discordAuth").expect(302);
    expect(saveFacultyRoleToDb).toHaveBeenCalledWith("discord-1", {});
  });
});

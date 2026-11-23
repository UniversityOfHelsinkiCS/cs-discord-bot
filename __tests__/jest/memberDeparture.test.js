const { removeDepartedMember, removeDepartedMembers } = require("../../src/discordBot/services/memberDeparture");
const { findUserByDiscordId, removeUsersByDbIds, getAllUsers } = require("../../src/db/services/userService");
const { findInstructedCourseIds } = require("../../src/db/services/courseMemberService");
const { findCourseFromDbById } = require("../../src/db/services/courseService");
const { updateAnnouncementChannelMessage } = require("../../src/discordBot/services/service");

jest.mock("../../src/discordBot/services/service");
jest.mock("../../src/discordBot/services/logger");
jest.mock("../../src/db/services/userService");
jest.mock("../../src/db/services/courseMemberService");
jest.mock("../../src/db/services/courseService");

const models = { User: {}, CourseMember: {}, Course: {} };
const announcementChannels = [{ name: "wepa_announcement" }, { name: "ohpe_announcement" }];
const courses = { 1: { name: "wepa" }, 2: { name: "ohpe" } };

const buildGuild = (memberIds = []) => ({
  members: { cache: new Map(memberIds.map((id) => [id, {}])) },
  channels: { cache: { find: (fn) => announcementChannels.find(fn) } }
});

beforeEach(() => {
  jest.clearAllMocks();
  findUserByDiscordId.mockImplementation(async (discordId) => ({ id: `db-${discordId}` }));
  findInstructedCourseIds.mockResolvedValue([]);
  findCourseFromDbById.mockImplementation(async (courseId) => courses[courseId] ?? null);
  updateAnnouncementChannelMessage.mockResolvedValue();
});

describe("member departure", () => {
  test("removes the user record", async () => {
    await removeDepartedMember(buildGuild(), "discord-1", models);
    expect(removeUsersByDbIds).toHaveBeenCalledWith(["db-discord-1"], models.User);
  });

  test("refreshes the instructor list of every course the member instructed", async () => {
    findInstructedCourseIds.mockResolvedValueOnce([1, 2]);
    const guild = buildGuild();
    await removeDepartedMember(guild, "discord-1", models);
    expect(updateAnnouncementChannelMessage).toHaveBeenCalledTimes(2);
    expect(updateAnnouncementChannelMessage).toHaveBeenCalledWith(guild, announcementChannels[0], models);
    expect(updateAnnouncementChannelMessage).toHaveBeenCalledWith(guild, announcementChannels[1], models);
  });

  test("refreshes the instructor lists only after the user record is gone", async () => {
    const order = [];
    findInstructedCourseIds.mockResolvedValueOnce([1]);
    removeUsersByDbIds.mockImplementationOnce(async () => order.push("remove"));
    updateAnnouncementChannelMessage.mockImplementationOnce(async () => order.push("refresh"));
    await removeDepartedMember(buildGuild(), "discord-1", models);
    expect(order).toEqual(["remove", "refresh"]);
  });

  test("does not refresh any instructor list for a non-instructor", async () => {
    await removeDepartedMember(buildGuild(), "discord-1", models);
    expect(updateAnnouncementChannelMessage).not.toHaveBeenCalled();
  });

  test("still refreshes the other courses when one refresh fails", async () => {
    findInstructedCourseIds.mockResolvedValueOnce([1, 2]);
    updateAnnouncementChannelMessage.mockRejectedValueOnce(new Error("Missing Access"));
    await expect(removeDepartedMember(buildGuild(), "discord-1", models)).resolves.toBeUndefined();
    expect(updateAnnouncementChannelMessage).toHaveBeenCalledTimes(2);
  });

  test("does nothing for a member with no user record", async () => {
    findUserByDiscordId.mockResolvedValueOnce(null);
    await removeDepartedMember(buildGuild(), "discord-1", models);
    expect(removeUsersByDbIds).not.toHaveBeenCalled();
  });

  test("on startup removes only the users who are no longer on the server", async () => {
    getAllUsers.mockResolvedValueOnce([{ discordId: "stayed" }, { discordId: "left-1" }, { discordId: "left-2" }]);
    await removeDepartedMembers(buildGuild(["stayed"]), models);
    expect(removeUsersByDbIds).toHaveBeenCalledTimes(2);
    expect(removeUsersByDbIds).toHaveBeenCalledWith(["db-left-1"], models.User);
    expect(removeUsersByDbIds).toHaveBeenCalledWith(["db-left-2"], models.User);
  });
});

const { execute } = require("../../../src/discordBot/commands/admin/list_bridges");
const { getAllCourses } = require("../../../src/db/services/courseService");
const { findChannelsByCourse } = require("../../../src/db/services/channelService");

jest.mock("../../../src/db/services/courseService");
jest.mock("../../../src/db/services/channelService");

const { messageInCommandsChannel, teacher, student } = require("../../mocks/mockMessages");

const courseModelMock = {};
const channelModelMock = {};

afterEach(() => {
  jest.clearAllMocks();
  messageInCommandsChannel.reply.mockClear();
});

describe("prefix list_bridges", () => {
  test("Only administrator can use the command", async () => {
    messageInCommandsChannel.member = student;
    await execute(messageInCommandsChannel, [], { Course: courseModelMock, Channel: channelModelMock });
    expect(getAllCourses).toHaveBeenCalledTimes(0);
    expect(messageInCommandsChannel.reply).toHaveBeenCalledTimes(0);
  });

  test("Lists course name, telegramId and whether any of its channels are bridged", async () => {
    messageInCommandsChannel.member = teacher;
    getAllCourses.mockResolvedValue([
      { id: 1, name: "course1", telegramId: "123" },
      { id: 2, name: "course2", telegramId: null },
    ]);
    findChannelsByCourse
      .mockImplementationOnce(async () => [{ bridged: true }, { bridged: false }])
      .mockImplementationOnce(async () => [{ bridged: false }]);

    await execute(messageInCommandsChannel, [], { Course: courseModelMock, Channel: channelModelMock });

    expect(getAllCourses).toHaveBeenCalledWith(courseModelMock);
    expect(findChannelsByCourse).toHaveBeenCalledWith(1, channelModelMock);
    expect(findChannelsByCourse).toHaveBeenCalledWith(2, channelModelMock);
    expect(messageInCommandsChannel.reply).toHaveBeenCalledTimes(1);
    expect(messageInCommandsChannel.reply).toHaveBeenCalledWith(
      "course1 123 true\ncourse2 null false\n"
    );
  });
});

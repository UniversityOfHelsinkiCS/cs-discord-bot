const { execute } = require("../../../src/discordBot/commands/admin/remove_faculty_rights");
const { findUserByDiscordId } = require("../../../src/db/services/userService");
const { confirmChoiceNoInteraction } = require("../../../src/discordBot/services/confirm");

jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/confirm");
jest.mock("../../../src/db/services/userService");

const { messageInCommandsChannel, teacher, student } = require("../../mocks/mockMessages");

const userModelInstanceMock = {
  id: 1,
  name: "JonDoe",
  admin: false,
  faculty: true,
  discordId: 10,
  save: jest.fn(),
};

confirmChoiceNoInteraction.mockImplementation(() => true);
findUserByDiscordId
  .mockImplementation(() => userModelInstanceMock)
  .mockImplementationOnce(() => null)
;

const userModelMock = {
};

afterEach(() => {
  jest.clearAllMocks();
});

describe("prefix remove_faculty_rights", () => {
  test("Does nothing if user doesn't exist", async () => {
    messageInCommandsChannel.member = teacher;
    const userId = "invalidId";
    const response = `Error: no user found with the id ${userId}.`;
    await execute(messageInCommandsChannel, [userId], userModelMock);
    expect(confirmChoiceNoInteraction).toHaveBeenCalledTimes(0);
    expect(userModelInstanceMock.save).toHaveBeenCalledTimes(0);
    expect(messageInCommandsChannel.reply).toHaveBeenCalledTimes(1);
    expect(messageInCommandsChannel.reply).toHaveBeenCalledWith(response);
  });

  test("Only administrator can use the command", async () => {
    messageInCommandsChannel.member = student;
    const userId = "10";
    await execute(messageInCommandsChannel, [userId], userModelMock);
    expect(messageInCommandsChannel.reply).toHaveBeenCalledTimes(0);
    expect(findUserByDiscordId).toHaveBeenCalledTimes(0);
  });

  test("Does nothing if command is declined", async () => {
    confirmChoiceNoInteraction.mockImplementationOnce(() => false);
    messageInCommandsChannel.member = teacher;
    const userId = "10";
    await execute(messageInCommandsChannel, [userId], userModelMock);
    expect(confirmChoiceNoInteraction).toHaveBeenCalledTimes(1);
    expect(userModelInstanceMock.save).toHaveBeenCalledTimes(0);
    expect(userModelInstanceMock.faculty).toBe(true);
  });

  test("Saves faculty value if user exists", async () => {
    messageInCommandsChannel.member = teacher;
    const userId = "10";
    await execute(messageInCommandsChannel, [userId], userModelMock);
    expect(confirmChoiceNoInteraction).toHaveBeenCalledTimes(1);
    expect(userModelInstanceMock.save).toHaveBeenCalledTimes(1);
    expect(userModelInstanceMock.faculty).toBe(false);
  });
});

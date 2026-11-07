const { execute } = require("../../../src/discordBot/commands/student/instructors");
const { sendEphemeral, editEphemeral, editErrorEphemeral } = require("../../../src/discordBot/services/message");

jest.mock("../../../src/discordBot/services/message");

const { studentInteractionWithoutOptions, defaultStudentInteraction } = require("../../mocks/mockInteraction");

const roleString = "test";
const initialResponse = "Fetching instructors...";

const models = {
  Course: { findOne: jest.fn(() => ({ id: 1, name: roleString })) },
  CourseMember: { findAll: jest.fn(() => []) },
  User: { findAll: jest.fn(() => []) }
};

afterEach(() => {
  jest.clearAllMocks();
});

describe("slash instructors command", () => {
  test("instructors command used outside course channels", async () => {
    models.Course.findOne.mockImplementationOnce(() => null);
    const client = studentInteractionWithoutOptions.client;
    const response = "Use the command in a course channel.";
    await execute(studentInteractionWithoutOptions, client, models);
    expect(sendEphemeral).toHaveBeenCalledTimes(1);
    expect(sendEphemeral).toHaveBeenCalledWith(studentInteractionWithoutOptions, initialResponse);
    expect(editErrorEphemeral).toHaveBeenCalledTimes(1);
    expect(editErrorEphemeral).toHaveBeenCalledWith(studentInteractionWithoutOptions, response);
  });

  test("instructors command used without course instructors", async () => {
    const client = defaultStudentInteraction.client;
    const response = `No instructors for ${roleString}`;
    await execute(defaultStudentInteraction, client, models);
    expect(sendEphemeral).toHaveBeenCalledTimes(1);
    expect(sendEphemeral).toHaveBeenCalledWith(defaultStudentInteraction, initialResponse);
    expect(editErrorEphemeral).toHaveBeenCalledTimes(1);
    expect(editErrorEphemeral).toHaveBeenCalledWith(defaultStudentInteraction, response);
  });

  test("instructors are listed from the database with faculty first", async () => {
    models.CourseMember.findAll.mockImplementationOnce(() => [{ userId: 1 }, { userId: 2 }]);
    models.User.findAll.mockImplementationOnce(() => [
      { discordId: "20", faculty: false },
      { discordId: "10", faculty: true }
    ]);
    const client = defaultStudentInteraction.client;
    await execute(defaultStudentInteraction, client, models);
    expect(models.CourseMember.findAll).toHaveBeenCalledWith({ where: { courseId: 1, instructor: true } });
    expect(models.User.findAll).toHaveBeenCalledWith({ where: { id: [1, 2] } });
    expect(editEphemeral).toHaveBeenCalledWith(
      defaultStudentInteraction,
      `Here are the instructors for ${roleString}: <@10>, <@20>`
    );
  });
});

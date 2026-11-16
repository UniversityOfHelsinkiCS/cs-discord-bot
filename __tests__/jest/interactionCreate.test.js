const { execute } = require("../../src/discordBot/events/interactionCreate");
const { sendErrorReport, sendErrorEphemeral } = require("../../src/discordBot/services/message");
const { logError, logInteractionError } = require("../../src/discordBot/services/logger");

jest.mock("../../src/discordBot/services/message");
jest.mock("../../src/discordBot/services/logger");

const unknownInteraction = Object.assign(new Error("Unknown interaction"), { code: 10062 });

const buildCommandInteraction = () => ({
  commandName: "remove_faculty_rights",
  isAutocomplete: () => false,
  isButton: () => false,
  isChatInputCommand: () => true
});

const buildClient = (commandExecute) => ({
  slashCommands: new Map([["remove_faculty_rights", { execute: commandExecute }]])
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  console.error.mockRestore();
});

describe("interactionCreate error handling", () => {
  test("a failing command is reported and answered", async () => {
    const commandExecute = jest.fn().mockRejectedValue(new Error("boom"));
    sendErrorReport.mockResolvedValue();
    sendErrorEphemeral.mockResolvedValue();

    await execute(buildCommandInteraction(), buildClient(commandExecute), {});

    expect(logInteractionError).toHaveBeenCalledTimes(1);
    expect(sendErrorReport).toHaveBeenCalledTimes(1);
    expect(sendErrorEphemeral).toHaveBeenCalledTimes(1);
  });

  test("an expired interaction is reported but not answered, since it can no longer be replied to", async () => {
    const commandExecute = jest.fn().mockRejectedValue(unknownInteraction);
    sendErrorReport.mockResolvedValue();

    await expect(execute(buildCommandInteraction(), buildClient(commandExecute), {})).resolves.toBeUndefined();

    expect(logInteractionError).toHaveBeenCalledTimes(1);
    expect(sendErrorReport).toHaveBeenCalledTimes(1);
    expect(sendErrorEphemeral).not.toHaveBeenCalled();
  });

  test("a failing error reply is logged instead of thrown", async () => {
    const commandExecute = jest.fn().mockRejectedValue(new Error("boom"));
    const replyError = new Error("reply failed");
    sendErrorReport.mockResolvedValue();
    sendErrorEphemeral.mockRejectedValue(replyError);

    await expect(execute(buildCommandInteraction(), buildClient(commandExecute), {})).resolves.toBeUndefined();

    expect(logError).toHaveBeenCalledWith(replyError);
  });

  test("a failing error report still answers the user", async () => {
    const commandExecute = jest.fn().mockRejectedValue(new Error("boom"));
    sendErrorReport.mockRejectedValue(new Error("commands channel missing"));
    sendErrorEphemeral.mockResolvedValue();

    await expect(execute(buildCommandInteraction(), buildClient(commandExecute), {})).resolves.toBeUndefined();

    expect(sendErrorEphemeral).toHaveBeenCalledTimes(1);
  });
});

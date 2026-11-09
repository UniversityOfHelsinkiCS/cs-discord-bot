const { execute } = require("../../src/discordBot/events/interactionCreate");
const { sendErrorReport, sendErrorEphemeral } = require("../../src/discordBot/services/message");
const { logError, logInteractionError } = require("../../src/discordBot/services/logger");

jest.mock("../../src/discordBot/services/message");
jest.mock("../../src/discordBot/services/logger");

const unknownInteraction = new Error("DiscordAPIError[10062]: Unknown interaction");

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

  test("an expired interaction does not make the error handler throw", async () => {
    const commandExecute = jest.fn().mockRejectedValue(unknownInteraction);
    sendErrorReport.mockResolvedValue();
    sendErrorEphemeral.mockRejectedValue(unknownInteraction);

    await expect(execute(buildCommandInteraction(), buildClient(commandExecute), {})).resolves.toBeUndefined();

    expect(sendErrorReport).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(unknownInteraction);
  });

  test("a failing error report still answers the user", async () => {
    const commandExecute = jest.fn().mockRejectedValue(new Error("boom"));
    sendErrorReport.mockRejectedValue(new Error("commands channel missing"));
    sendErrorEphemeral.mockResolvedValue();

    await expect(execute(buildCommandInteraction(), buildClient(commandExecute), {})).resolves.toBeUndefined();

    expect(sendErrorEphemeral).toHaveBeenCalledTimes(1);
  });
});

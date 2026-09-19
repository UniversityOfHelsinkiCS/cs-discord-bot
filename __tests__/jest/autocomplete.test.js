const { respondWithChoices, respondWithCourses } = require("../../src/discordBot/services/autocomplete");
const { execute } = require("../../src/discordBot/events/interactionCreate");
const { logError } = require("../../src/discordBot/services/logger");

jest.mock("../../src/discordBot/services/logger");
jest.mock("../../src/discordBot/services/message");

const buildAutocomplete = (typed, commandName = "test") => ({
  commandName,
  isAutocomplete: () => true,
  isChatInputCommand: () => false,
  options: { getFocused: jest.fn(() => typed) },
  respond: jest.fn()
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("respondWithChoices", () => {
  const choices = [
    { name: "OHPE - Ohjelmoinnin perusteet - ohpe", value: "ohpe" },
    { name: "TKT - Tietokoneen toiminta - tikape", value: "tikape" },
    { name: "WEBA - Web-palvelinohjelmointi - weba", value: "weba" }
  ];

  test("offers every choice when nothing is typed", async () => {
    const interaction = buildAutocomplete("");
    await respondWithChoices(interaction, choices);
    expect(interaction.respond).toHaveBeenCalledWith(choices);
  });

  test("matches the typed text against the name, ignoring case", async () => {
    const interaction = buildAutocomplete("  TIETOKONEEN ");
    await respondWithChoices(interaction, choices);
    expect(interaction.respond).toHaveBeenCalledWith([choices[1]]);
  });

  test("matches the typed text against the value", async () => {
    const interaction = buildAutocomplete("weba");
    await respondWithChoices(interaction, choices);
    expect(interaction.respond).toHaveBeenCalledWith([choices[2]]);
  });

  test("responds with an empty list when nothing matches", async () => {
    const interaction = buildAutocomplete("nothing");
    await respondWithChoices(interaction, choices);
    expect(interaction.respond).toHaveBeenCalledWith([]);
  });

  test("offers at most 25 choices", async () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ name: `Course ${i}`, value: `c${i}` }));
    const interaction = buildAutocomplete("");
    await respondWithChoices(interaction, many);
    expect(interaction.respond.mock.calls[0][0]).toHaveLength(25);
  });

  test("cuts names and values to Discord's 100 character limit", async () => {
    const interaction = buildAutocomplete("");
    await respondWithChoices(interaction, [{ name: "n".repeat(150), value: "v".repeat(150) }]);
    const [choice] = interaction.respond.mock.calls[0][0];
    expect(choice.name).toHaveLength(100);
    expect(choice.value).toHaveLength(100);
  });
});

describe("respondWithCourses", () => {
  test("shows the capitalized full name, the course name and the course code in capitals, and returns the name as value", async () => {
    const interaction = buildAutocomplete("");
    await respondWithCourses(interaction, [{ code: "tkt10002", fullName: "ohjelmoinnin perusteet", name: "ohpe" }]);
    expect(interaction.respond).toHaveBeenCalledWith([
      { name: "Ohjelmoinnin perusteet - ohpe - TKT10002", value: "ohpe" }
    ]);
  });

  test("keeps a code without letters as it is", async () => {
    const interaction = buildAutocomplete("");
    await respondWithCourses(interaction, [{ code: "101", fullName: "Basics", name: "basics" }]);
    expect(interaction.respond).toHaveBeenCalledWith([{ name: "Basics - basics - 101", value: "basics" }]);
  });

  test("filters by the typed text", async () => {
    const interaction = buildAutocomplete("weba");
    await respondWithCourses(interaction, [
      { code: "tkt1", fullName: "Ohjelmoinnin perusteet", name: "ohpe" },
      { code: "tkt2", fullName: "Web-palvelinohjelmointi", name: "weba" }
    ]);
    expect(interaction.respond).toHaveBeenCalledWith([
      { name: "Web-palvelinohjelmointi - weba - TKT2", value: "weba" }
    ]);
  });
});

describe("interactionCreate autocomplete", () => {
  const models = {};

  test("passes an autocomplete interaction to the command's autocomplete function", async () => {
    const autocomplete = jest.fn();
    const client = { slashCommands: new Map([["test", { autocomplete, execute: jest.fn() }]]) };
    const interaction = buildAutocomplete("x");
    await execute(interaction, client, models);
    expect(autocomplete).toHaveBeenCalledWith(interaction, client, models);
  });

  test("never runs the command for an autocomplete interaction", async () => {
    const command = { autocomplete: jest.fn(), execute: jest.fn() };
    const client = { slashCommands: new Map([["test", command]]) };
    await execute(buildAutocomplete("x"), client, models);
    expect(command.execute).not.toHaveBeenCalled();
  });

  test("ignores a command that has no autocomplete function", async () => {
    const client = { slashCommands: new Map([["test", { execute: jest.fn() }]]) };
    await expect(execute(buildAutocomplete("x"), client, models)).resolves.toBeUndefined();
  });

  test("ignores an unknown command", async () => {
    const client = { slashCommands: new Map() };
    await expect(execute(buildAutocomplete("x", "missing"), client, models)).resolves.toBeUndefined();
  });

  test("logs a failing autocomplete instead of throwing", async () => {
    const error = new Error("database down");
    const client = {
      slashCommands: new Map([
        [
          "test",
          {
            autocomplete: jest.fn(() => {
              throw error;
            })
          }
        ]
      ])
    };
    await expect(execute(buildAutocomplete("x"), client, models)).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalledWith(error);
  });
});

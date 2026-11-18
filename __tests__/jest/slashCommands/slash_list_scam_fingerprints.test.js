const { execute } = require("../../../src/discordBot/commands/admin/list_scam_fingerprints");
const { listScams } = require("../../../src/db/services/scamImageService");
const { requireAdmin } = require("../../../src/discordBot/services/permissions");
const { replyInChunks } = require("../../../src/discordBot/services/message");

jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/permissions");
jest.mock("../../../src/db/services/scamImageService");

const models = { ScamImage: {} };
const interaction = {};

beforeEach(() => {
  requireAdmin.mockResolvedValue(true);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("slash list_scam_fingerprints", () => {
  test("only admins can use the command", async () => {
    requireAdmin.mockResolvedValueOnce(false);
    await execute(interaction, {}, models);
    expect(listScams).not.toHaveBeenCalled();
  });

  test("lists each scam with its images and when it was added", async () => {
    listScams.mockResolvedValueOnce([
      { scamName: "gift", images: ["1.png", "2.png"], addedAt: new Date("2026-11-16T10:00:00Z") },
      { scamName: "nitro", images: ["3.png"], addedAt: new Date("2026-11-17T10:00:00Z") }
    ]);
    await execute(interaction, {}, models);
    expect(replyInChunks).toHaveBeenCalledWith(
      interaction,
      "Known scams (2):\n**gift** (2 images, added 2026-11-16): 1.png, 2.png\n**nitro** (1 image, added 2026-11-17): 3.png"
    );
  });

  test("says so when no scams have been added", async () => {
    listScams.mockResolvedValueOnce([]);
    await execute(interaction, {}, models);
    expect(replyInChunks).toHaveBeenCalledWith(interaction, "No scam fingerprints have been added.");
  });
});

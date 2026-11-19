const { execute, data } = require("../../../src/discordBot/commands/admin/add_scam_fingerprint_from_message");
const {
  getKnownScamImages,
  scamNameExists,
  addScamFingerprints
} = require("../../../src/db/services/scamImageService");
const { hashReferenceImage } = require("../../../src/discordBot/services/perceptualHash");
const { downloadPreview } = require("../../../src/discordBot/services/scamImageMatcher");
const { requireAdmin } = require("../../../src/discordBot/services/permissions");
const {
  sendEphemeral,
  sendErrorEphemeral,
  editEphemeral,
  sendReportToCommandsChannel
} = require("../../../src/discordBot/services/message");

jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/permissions");
jest.mock("../../../src/discordBot/services/logger", () => ({ logError: jest.fn() }));
jest.mock("../../../src/db/services/scamImageService");
jest.mock("../../../src/discordBot/services/perceptualHash");
jest.mock("../../../src/discordBot/services/scamImageMatcher");

const models = { ScamImage: {} };

const attachment = (name, contentType = "image/png") => ({ name, contentType, url: `https://cdn.example.com/${name}` });

const makeSubmitted = (scamName) => ({
  customId: "add_scam_fingerprint:interaction-1",
  user: { id: "admin-1" },
  fields: { getTextInputValue: jest.fn(() => scamName) }
});

const makeInteraction = (attachments, submitted) => ({
  id: "interaction-1",
  user: { id: "admin-1" },
  targetMessage: {
    url: "https://discord.com/channels/1/2/3",
    attachments: new Map(attachments.map((file) => [file.name, file]))
  },
  showModal: jest.fn().mockResolvedValue(),
  awaitModalSubmit: submitted
    ? jest.fn().mockResolvedValue(submitted)
    : jest.fn().mockRejectedValue(new Error("Collector received no interactions before ending with reason: time"))
});

beforeEach(() => {
  requireAdmin.mockResolvedValue(true);
  scamNameExists.mockResolvedValue(false);
  getKnownScamImages.mockResolvedValue([]);
  downloadPreview.mockImplementation(async (file) => Buffer.from(file.name));
  hashReferenceImage.mockImplementation(async (buffer) => [`hash-${buffer.toString()}`]);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("Add scam fingerprint message command", () => {
  test("is a message context menu command for administrators", () => {
    const json = data.toJSON();
    expect(json.name).toBe("Add scam fingerprint");
    expect(json.type).toBe(3);
    expect(json.default_member_permissions).toBe("8");
  });

  test("only admins can add the images", async () => {
    requireAdmin.mockResolvedValueOnce(false);
    const submitted = makeSubmitted("story");
    await execute(makeInteraction([attachment("1.png")], submitted), {}, models);
    expect(requireAdmin).toHaveBeenCalledWith(submitted, models);
    expect(addScamFingerprints).not.toHaveBeenCalled();
  });

  test("refuses a message without images", async () => {
    const interaction = makeInteraction([attachment("notes.txt", "text/plain")], makeSubmitted("story"));
    await execute(interaction, {}, models);
    expect(interaction.showModal).not.toHaveBeenCalled();
    expect(sendErrorEphemeral).toHaveBeenCalledWith(interaction, "That message has no image attachments.");
  });

  test("asks for a scam name and adds the message's images under it", async () => {
    const submitted = makeSubmitted(" story ");
    const interaction = makeInteraction(
      [attachment("1.png"), attachment("notes.txt", "text/plain"), attachment("2.jpg", "image/jpeg")],
      submitted
    );
    const client = { id: "client" };
    await execute(interaction, client, models);
    const modal = interaction.showModal.mock.calls[0][0].toJSON();
    expect(modal.custom_id).toBe("add_scam_fingerprint:interaction-1");
    expect(modal.title).toBe("Add 2 images as a known scam");
    expect(sendEphemeral).toHaveBeenCalledWith(submitted, "Adding scam fingerprints...");
    expect(addScamFingerprints).toHaveBeenCalledWith(
      "story",
      [
        { name: "1.png", hashes: ["hash-1.png"] },
        { name: "2.jpg", hashes: ["hash-2.jpg"] }
      ],
      models.ScamImage
    );
    expect(editEphemeral).toHaveBeenCalledWith(submitted, 'Added 2 images to the scam "story".');
    expect(sendReportToCommandsChannel).toHaveBeenCalledWith(
      client,
      "**SCAM FINGERPRINT ADDED**\nScam: story\nImages: 2 images (1.png, 2.jpg)\nFrom: https://discord.com/channels/1/2/3\nBy: <@admin-1>"
    );
  });

  test("only accepts the form from the admin who opened it", async () => {
    const interaction = makeInteraction([attachment("1.png")], makeSubmitted("story"));
    await execute(interaction, {}, models);
    const { filter } = interaction.awaitModalSubmit.mock.calls[0][0];
    expect(filter({ customId: "add_scam_fingerprint:interaction-1", user: { id: "admin-1" } })).toBe(true);
    expect(filter({ customId: "add_scam_fingerprint:interaction-1", user: { id: "someone-else" } })).toBe(false);
    expect(filter({ customId: "add_scam_fingerprint:other", user: { id: "admin-1" } })).toBe(false);
  });

  test("does nothing when the form is closed without submitting", async () => {
    const interaction = makeInteraction([attachment("1.png")]);
    await expect(execute(interaction, {}, models)).resolves.toBeUndefined();
    expect(sendEphemeral).not.toHaveBeenCalled();
    expect(addScamFingerprints).not.toHaveBeenCalled();
  });
});

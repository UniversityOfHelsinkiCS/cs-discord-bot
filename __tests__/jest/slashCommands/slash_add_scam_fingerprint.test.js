const { execute, data } = require("../../../src/discordBot/commands/admin/add_scam_fingerprint");
const {
  getKnownScamImages,
  scamNameExists,
  addScamFingerprints
} = require("../../../src/db/services/scamImageService");
const { hashReferenceImage } = require("../../../src/discordBot/services/perceptualHash");
const { downloadPreview } = require("../../../src/discordBot/services/scamImageMatcher");
const { requireAdmin } = require("../../../src/discordBot/services/permissions");
const { editEphemeral, editErrorEphemeral } = require("../../../src/discordBot/services/message");

jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/permissions");
jest.mock("../../../src/discordBot/services/logger", () => ({ logError: jest.fn() }));
jest.mock("../../../src/db/services/scamImageService");
jest.mock("../../../src/discordBot/services/perceptualHash");
jest.mock("../../../src/discordBot/services/scamImageMatcher");

const models = { ScamImage: {} };

const image = (name, contentType = "image/png") => ({ name, contentType, url: `https://cdn.example.com/${name}` });

const makeInteraction = (scamName, attachments) => ({
  options: {
    getString: jest.fn(() => scamName),
    getAttachment: jest.fn((name) => attachments[Number(name.replace("image", "")) - 1] ?? null)
  }
});

beforeEach(() => {
  requireAdmin.mockResolvedValue(true);
  scamNameExists.mockResolvedValue(false);
  getKnownScamImages.mockResolvedValue([]);
  downloadPreview.mockImplementation(async (attachment) => Buffer.from(attachment.name));
  hashReferenceImage.mockImplementation(async (buffer) => [`hash-${buffer.toString()}`]);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("slash add_scam_fingerprint", () => {
  test("takes a scam name and up to ten images", () => {
    const options = data.toJSON().options;
    expect(options.map((option) => option.name)).toEqual([
      "scam_name",
      ...Array.from({ length: 10 }, (_slot, index) => `image${index + 1}`)
    ]);
    expect(options.filter((option) => option.required).map((option) => option.name)).toEqual(["scam_name", "image1"]);
  });

  test("only admins can use the command", async () => {
    requireAdmin.mockResolvedValueOnce(false);
    await execute(makeInteraction("story", [image("1.png")]), {}, models);
    expect(addScamFingerprints).not.toHaveBeenCalled();
  });

  test("adds every image of the command under one scam name", async () => {
    const interaction = makeInteraction(" story ", [image("1.png"), image("2.png"), image("3.png")]);
    await execute(interaction, {}, models);
    expect(addScamFingerprints).toHaveBeenCalledWith(
      "story",
      [
        { name: "1.png", hashes: ["hash-1.png"] },
        { name: "2.png", hashes: ["hash-2.png"] },
        { name: "3.png", hashes: ["hash-3.png"] }
      ],
      models.ScamImage
    );
    expect(editEphemeral).toHaveBeenCalledWith(interaction, 'Added 3 images to the scam "story".');
  });

  test("refuses a scam name that is already used", async () => {
    scamNameExists.mockResolvedValueOnce(true);
    const interaction = makeInteraction("story", [image("1.png")]);
    await execute(interaction, {}, models);
    expect(addScamFingerprints).not.toHaveBeenCalled();
    expect(editErrorEphemeral).toHaveBeenCalledWith(
      interaction,
      'A scam called "story" already exists. Pick another name.'
    );
  });

  test("refuses files that are not images", async () => {
    const interaction = makeInteraction("story", [image("1.png"), image("notes.txt", "text/plain")]);
    await execute(interaction, {}, models);
    expect(addScamFingerprints).not.toHaveBeenCalled();
    expect(editErrorEphemeral).toHaveBeenCalledWith(interaction, "These files are not images: notes.txt");
  });

  test("skips known, blank and unreadable images and says why", async () => {
    getKnownScamImages.mockResolvedValueOnce([{ scamName: "old", image: "x.png", hashes: ["hash-known.png"] }]);
    hashReferenceImage.mockImplementation(async (buffer) =>
      buffer.toString() === "blank.png" ? [] : [`hash-${buffer}`]
    );
    downloadPreview.mockImplementation(async (attachment) => {
      if (attachment.name === "broken.png") throw new Error("404");
      return Buffer.from(attachment.name);
    });
    const interaction = makeInteraction("story", [
      image("1.png"),
      image("known.png"),
      image("blank.png"),
      image("broken.png")
    ]);
    await execute(interaction, {}, models);
    expect(addScamFingerprints).toHaveBeenCalledWith(
      "story",
      [{ name: "1.png", hashes: ["hash-1.png"] }],
      models.ScamImage
    );
    expect(editEphemeral).toHaveBeenCalledWith(
      interaction,
      'Added 1 image to the scam "story".\nSkipped:' +
        "\n• known.png: already a known scam image" +
        "\n• blank.png: too little detail to recognise" +
        "\n• broken.png: could not be downloaded or read"
    );
  });

  test("adds nothing when no image can be used", async () => {
    hashReferenceImage.mockResolvedValue([]);
    const interaction = makeInteraction("story", [image("blank.png")]);
    await execute(interaction, {}, models);
    expect(addScamFingerprints).not.toHaveBeenCalled();
    expect(editErrorEphemeral).toHaveBeenCalledWith(
      interaction,
      "No images were added.\n• blank.png: too little detail to recognise"
    );
  });
});

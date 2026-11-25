const { execute, data } = require("../../../src/discordBot/commands/admin/kick_user_from_message");
const { requireAdmin } = require("../../../src/discordBot/services/permissions");
const {
  sendEphemeral,
  sendErrorEphemeral,
  editEphemeral,
  editErrorEphemeral,
  sendFollowUpEphemeral,
  sendReportToCommandsChannel
} = require("../../../src/discordBot/services/message");
const { saveScamImages } = require("../../../src/discordBot/services/scamFingerprints");
const { kickWithDm, KICK_RESULT } = require("../../../src/discordBot/services/kick");

jest.mock("../../../src/discordBot/services/message");
jest.mock("../../../src/discordBot/services/permissions");
jest.mock("../../../src/discordBot/services/logger", () => ({ logError: jest.fn() }));
jest.mock("../../../src/discordBot/services/firewall", () => ({
  buildRecoveryMessage: (finding) => `recovery: ${finding}`
}));
jest.mock("../../../src/discordBot/services/scamFingerprints", () => ({
  isImage: (attachment) => attachment.contentType?.startsWith("image/"),
  saveScamImages: jest.fn()
}));
jest.mock("../../../src/discordBot/services/kick", () => ({
  KICK_RESULT: { kicked: "kicked", failed: "failed", alreadyKicking: "alreadyKicking" },
  kickWithDm: jest.fn(),
  withKickResult: (content, kickResult) => (kickResult === "failed" ? `${content}\nKick failed` : content)
}));

const models = {};
const client = { guild: { id: "guild-1" } };
const target = { id: "target-1", tag: "target#0001", bot: false };
const image = { name: "scam.png", contentType: "image/png", url: "https://cdn.example.com/scam.png" };

const makeSubmitted = ({ reason, details = "", addFingerprints, scamName = "" }) => {
  const selects = { reason: [reason], add_fingerprints: addFingerprints ? [addFingerprints] : [] };
  const texts = { details, scam_name: scamName };
  return {
    customId: "kick_user:interaction-1",
    user: { id: "admin-1" },
    fields: {
      getStringSelectValues: jest.fn((id) => selects[id]),
      getTextInputValue: jest.fn((id) => texts[id])
    }
  };
};

const makeInteraction = ({ submitted, attachments = [], author = target } = {}) => ({
  id: "interaction-1",
  user: { id: "admin-1", tag: "admin#0001" },
  targetMessage: {
    author,
    url: "https://discord.com/channels/1/2/3",
    channelId: "channel-2",
    attachments: new Map(attachments.map((file) => [file.name, file]))
  },
  showModal: jest.fn().mockResolvedValue(),
  awaitModalSubmit: submitted
    ? jest.fn().mockResolvedValue(submitted)
    : jest.fn().mockRejectedValue(new Error("Collector received no interactions before ending with reason: time"))
});

const shownModal = (interaction) => interaction.showModal.mock.calls[0][0].toJSON();
const modalFieldIds = (interaction) => shownModal(interaction).components.map((label) => label.component.custom_id);
const kickOptions = () => kickWithDm.mock.calls[0][2];

beforeEach(() => {
  requireAdmin.mockResolvedValue(true);
  kickWithDm.mockResolvedValue(KICK_RESULT.kicked);
  saveScamImages.mockResolvedValue(true);
  sendReportToCommandsChannel.mockResolvedValue();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("Kick user message command", () => {
  test("is a message context menu command for administrators", () => {
    const json = data.toJSON();
    expect(json.name).toBe("Kick user");
    expect(json.type).toBe(3);
    expect(json.default_member_permissions).toBe("8");
  });

  test("asks only for the reason and details when the message has no images", async () => {
    const interaction = makeInteraction({ submitted: makeSubmitted({ reason: "inappropriate_behavior" }) });
    await execute(interaction, client, models);
    expect(modalFieldIds(interaction)).toEqual(["reason", "details"]);
    const reasonOptions = shownModal(interaction).components[0].component.options.map((option) => option.label);
    expect(reasonOptions).toEqual(["Scam images", "Scam message", "Inappropriate behavior", "Other"]);
  });

  test("also asks about scam fingerprints when the message has images", async () => {
    const interaction = makeInteraction({
      submitted: makeSubmitted({ reason: "scam_images", addFingerprints: "no" }),
      attachments: [image]
    });
    await execute(interaction, client, models);
    expect(modalFieldIds(interaction)).toEqual(["reason", "details", "add_fingerprints", "scam_name"]);
  });

  test("kicks the author and sends them the reason", async () => {
    const interaction = makeInteraction({ submitted: makeSubmitted({ reason: "inappropriate_behavior" }) });
    await execute(interaction, client, models);
    expect(kickWithDm).toHaveBeenCalledWith(client.guild, target, expect.any(Object), models);
    expect(kickOptions().dm).toContain("Reason: Inappropriate behavior");
    expect(kickOptions().dm).toContain("rejoin in about a minute");
    expect(kickOptions().reason).toBe("Kicked by admin#0001: Inappropriate behavior");
    expect(editEphemeral).toHaveBeenCalledWith(expect.anything(), "Kicked <@target-1>. Reason: Inappropriate behavior");
  });

  test("uses the details as the reason for Other", async () => {
    const interaction = makeInteraction({ submitted: makeSubmitted({ reason: "other", details: "Spamming invites" }) });
    await execute(interaction, client, models);
    expect(kickOptions().dm).toContain("Reason: Spamming invites");
  });

  test("adds details to a listed reason", async () => {
    const interaction = makeInteraction({
      submitted: makeSubmitted({ reason: "inappropriate_behavior", details: "Harassing other members" })
    });
    await execute(interaction, client, models);
    expect(kickOptions().dm).toContain("Reason: Inappropriate behavior: Harassing other members");
  });

  test("Other without details is refused", async () => {
    const interaction = makeInteraction({ submitted: makeSubmitted({ reason: "other" }) });
    await execute(interaction, client, models);
    expect(editErrorEphemeral).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("Details"));
    expect(kickWithDm).not.toHaveBeenCalled();
  });

  test("a scam kick sends the compromised-account recovery DM", async () => {
    const interaction = makeInteraction({ submitted: makeSubmitted({ reason: "scam_message" }) });
    await execute(interaction, client, models);
    expect(kickOptions().dm).toBe("recovery: was removed by an admin as a scam");
  });

  test("adds the images to scam fingerprints before kicking", async () => {
    const order = [];
    saveScamImages.mockImplementationOnce(async () => order.push("fingerprint") && true);
    kickWithDm.mockImplementationOnce(async () => order.push("kick") && KICK_RESULT.kicked);
    const interaction = makeInteraction({
      submitted: makeSubmitted({ reason: "scam_images", addFingerprints: "yes", scamName: "gift-card" }),
      attachments: [image]
    });
    await execute(interaction, client, models);
    expect(order).toEqual(["fingerprint", "kick"]);
    expect(saveScamImages).toHaveBeenCalledWith(
      expect.objectContaining({
        rawScamName: "gift-card",
        attachments: [image],
        sourceUrl: interaction.targetMessage.url
      })
    );
    expect(sendFollowUpEphemeral).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining("Kicked <@target-1>")
    );
  });

  test("does not kick when adding the fingerprints fails", async () => {
    saveScamImages.mockResolvedValueOnce(false);
    const interaction = makeInteraction({
      submitted: makeSubmitted({ reason: "scam_images", addFingerprints: "yes", scamName: "taken" }),
      attachments: [image]
    });
    await execute(interaction, client, models);
    expect(kickWithDm).not.toHaveBeenCalled();
  });

  test("refuses to add fingerprints for a non-scam kick", async () => {
    const interaction = makeInteraction({
      submitted: makeSubmitted({ reason: "inappropriate_behavior", addFingerprints: "yes", scamName: "x" }),
      attachments: [image]
    });
    await execute(interaction, client, models);
    expect(editErrorEphemeral).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("Only scam kicks"));
    expect(saveScamImages).not.toHaveBeenCalled();
    expect(kickWithDm).not.toHaveBeenCalled();
  });

  test("refuses to add fingerprints without a scam name", async () => {
    const interaction = makeInteraction({
      submitted: makeSubmitted({ reason: "scam_images", addFingerprints: "yes" }),
      attachments: [image]
    });
    await execute(interaction, client, models);
    expect(saveScamImages).not.toHaveBeenCalled();
    expect(kickWithDm).not.toHaveBeenCalled();
  });

  test("reports the kick in the commands channel", async () => {
    const interaction = makeInteraction({ submitted: makeSubmitted({ reason: "inappropriate_behavior" }) });
    await execute(interaction, client, models);
    const [, report] = sendReportToCommandsChannel.mock.calls[0];
    expect(report).toContain("MEMBER KICKED BY AN ADMIN");
    expect(report).toContain("<@target-1>");
    expect(report).toContain("Reason: Inappropriate behavior");
    expect(report).toContain("By: <@admin-1>");
    expect(report).not.toContain("Kick failed");
  });

  test("a failed kick is reported and told to the admin", async () => {
    kickWithDm.mockResolvedValueOnce(KICK_RESULT.failed);
    const interaction = makeInteraction({ submitted: makeSubmitted({ reason: "inappropriate_behavior" }) });
    await execute(interaction, client, models);
    expect(sendReportToCommandsChannel.mock.calls[0][1]).toContain("Kick failed");
    expect(editEphemeral).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("Could not kick"));
  });

  test("a member who is already being kicked is not reported again", async () => {
    kickWithDm.mockResolvedValueOnce(KICK_RESULT.alreadyKicking);
    const interaction = makeInteraction({ submitted: makeSubmitted({ reason: "inappropriate_behavior" }) });
    await execute(interaction, client, models);
    expect(sendReportToCommandsChannel).not.toHaveBeenCalled();
    expect(editEphemeral).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("already being kicked"));
  });

  test("only admins can kick", async () => {
    requireAdmin.mockResolvedValueOnce(false);
    const interaction = makeInteraction({ submitted: makeSubmitted({ reason: "inappropriate_behavior" }) });
    await execute(interaction, client, models);
    expect(sendEphemeral).toHaveBeenCalledTimes(1);
    expect(kickWithDm).not.toHaveBeenCalled();
  });

  test("does nothing when the form is closed", async () => {
    await execute(makeInteraction(), client, models);
    expect(sendEphemeral).not.toHaveBeenCalled();
    expect(kickWithDm).not.toHaveBeenCalled();
  });

  test.each([
    ["a bot", { ...target, bot: true }],
    ["yourself", { ...target, id: "admin-1" }]
  ])("refuses to kick %s without opening the form", async (_case, author) => {
    const interaction = makeInteraction({ author });
    await execute(interaction, client, models);
    expect(sendErrorEphemeral).toHaveBeenCalledTimes(1);
    expect(interaction.showModal).not.toHaveBeenCalled();
  });
});

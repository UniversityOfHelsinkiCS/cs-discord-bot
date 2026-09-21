const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require("discord.js");
const { requireFaculty } = require("../../services/permissions");

const {
  sendEphemeral,
  editEphemeral,
  editEphemeralWithComponents,
  editEphemeralClearComponents
} = require("../../services/message");

const { facultyRole } = require("../../../../config.json");
const numbers = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

const execute = async (interaction, client, models) => {
  if (!(await requireFaculty(interaction, models))) return;

  const guild = client.guild;
  const channel = guild.channels.cache.get(interaction.channelId);

  const pollTitle = interaction.options.getString("title").trim();
  await sendEphemeral(interaction, "Creating poll...");

  let answers = 0;
  const voteMap = new Map();
  const answerList = interaction.options.getString("answers").split(" | ");
  if (answerList.length > 10) {
    await editEphemeral(interaction, "Too many answer options, acceptable amount is between 1 - 10");
    return;
  }

  let answerDescription = "";

  if (interaction.options.getString("description")) {
    answerDescription = interaction.options.getString("description") + "\n\n\n";
  }

  for (let i = 0; i < answerList.length; i++) {
    answerDescription = answerDescription.concat(numbers[i] + " -> " + answerList[i] + "\n\n");
    answers++;
    voteMap.set(numbers[i], 0);
  }

  answerDescription = answerDescription.concat(
    "\n\nYou can answer only one option.\nYou can change your answer by clicking another choice\nYou can remove your answer with ❌"
  );

  const pollEmbed = new EmbedBuilder().setColor("#0099ff").setTitle(pollTitle).setDescription(answerDescription);

  const row = new ActionRowBuilder();
  const row2 = new ActionRowBuilder();
  const row3 = new ActionRowBuilder();

  for (let i = 0; i < 5 && i < answerList.length; i++) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("" + i)
        .setLabel(numbers[i])
        .setStyle(ButtonStyle.Primary)
    );
  }

  if (answerList.length > 5) {
    for (let i = 5; i < answerList.length; i++) {
      row2.addComponents(
        new ButtonBuilder()
          .setCustomId("" + i)
          .setLabel(numbers[i])
          .setStyle(ButtonStyle.Primary)
      );
    }
  }
  if (answerList.length < 5) {
    row.addComponents(new ButtonBuilder().setCustomId("x").setLabel("❌").setStyle(ButtonStyle.Secondary));
  } else if (answerList.length < 10) {
    row2.addComponents(new ButtonBuilder().setCustomId("x").setLabel("❌").setStyle(ButtonStyle.Secondary));
  } else {
    row3.addComponents(new ButtonBuilder().setCustomId("x").setLabel("❌").setStyle(ButtonStyle.Secondary));
  }
  let msgEmbed = "";

  if (answerList.length === 10) {
    msgEmbed = await channel.send({ embeds: [pollEmbed], components: [row, row2, row3] });
  } else if (answerList.length >= 5) {
    msgEmbed = await channel.send({ embeds: [pollEmbed], components: [row, row2] });
  } else {
    msgEmbed = await channel.send({ embeds: [pollEmbed], components: [row] });
  }

  const closeRow = new ActionRowBuilder();
  closeRow.addComponents(
    new ButtonBuilder().setCustomId("close").setLabel("Close the poll").setStyle(ButtonStyle.Danger)
  );

  let duration = "";
  if (interaction.options.getInteger("duration") >= 15) {
    duration = 14 * 60000;
  } else {
    duration = interaction.options.getInteger("duration") * 60000;
  }

  const closeReply = await editEphemeralWithComponents(
    interaction,
    "Poll started, it will close in " + (duration / 60000).toFixed() + " minutes or you can close it from this button.",
    closeRow
  );
  let stop = false;
  const collectorButtonClose = closeReply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: duration
  });

  collectorButtonClose.on("collect", (i) => {
    const buttonId = i.customId;
    if (buttonId === "close");
    stop = true;
  });

  const collectorbutton = msgEmbed.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: duration
  });
  const userMap = new Map();

  collectorbutton.on("collect", (i) => {
    const userTag = i.user.tag;
    const buttonId = i.customId;
    if (!userMap.has(userTag) && !i.user.bot && buttonId !== "x") {
      userMap.set(userTag, numbers[buttonId]);
      voteMap.set(numbers[buttonId], voteMap.get(numbers[buttonId]) + 1);
      i.reply({
        content: "Thank you for answering! Your answer: " + answerList[buttonId],
        flags: MessageFlags.Ephemeral
      });
    } else if (buttonId == "x") {
      const emojiToRemove = userMap.get(userTag);
      voteMap.set(emojiToRemove, voteMap.get(emojiToRemove) - 1);
      userMap.delete(userTag);
      i.reply({ content: "Answer removed!", flags: MessageFlags.Ephemeral });
    } else {
      const emojiToRemove = userMap.get(userTag);
      voteMap.set(emojiToRemove, voteMap.get(emojiToRemove) - 1);
      voteMap.set(numbers[buttonId], voteMap.get(numbers[buttonId]) + 1);
      userMap.set(userTag, numbers[buttonId]);
      i.reply({ content: "Your answer has been changed to: " + answerList[buttonId], flags: MessageFlags.Ephemeral });
    }
  });

  for (let i = 0; i < duration;) {
    await sleep(1000);
    i = i + 1000;
    if (stop) {
      break;
    }
  }

  let resultsText = "";

  if (interaction.options.getString("description")) {
    resultsText = interaction.options.getString("description") + "\n\n\n";
  }

  let highestScore = 0;
  let highestOption = "";
  for (let i = 0, len = answers; i < len; i++) {
    resultsText = resultsText.concat(numbers[i] + " " + answerList[i] + " = " + voteMap.get(numbers[i]) + "\n\n");
    if (voteMap.get(numbers[i]) > highestScore) {
      highestScore = voteMap.get(numbers[i]);
    }
  }

  for (const [key, value] of voteMap.entries()) {
    if (value === highestScore) {
      if (highestOption === "") {
        highestOption = answerList[numbers.indexOf(key)];
      } else {
        highestOption = highestOption.concat(", " + answerList[numbers.indexOf(key)]);
      }
    }
  }

  resultsText = resultsText.concat("Most votes: " + highestOption);

  const resultEmbed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle("Results of the poll\n\n" + pollTitle)
    .setDescription(resultsText);

  await channel.send({ embeds: [resultEmbed] });

  msgEmbed.delete();

  await editEphemeralClearComponents(interaction, "Poll closed, results are in");

  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("create_poll")
    .setDescription("Create poll")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) => option.setName("title").setDescription("Poll title").setRequired(true))
    .addIntegerOption((option) =>
      option.setName("duration").setDescription("Duration of the poll (1-14 minutes)").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("answers")
        .setDescription("Answers for poll separated by | (e.g. answer1 | answer2 | answer3)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("description").setDescription("Set description for the poll").setRequired(false)
    ),
  execute,
  usage: "/create_poll ",
  description: "Create a poll for x duration*",
  roles: ["admin", facultyRole]
};

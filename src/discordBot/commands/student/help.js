const { SlashCommandBuilder } = require("discord.js");
const { editEphemeral, editErrorEphemeral, sendEphemeral, sendFollowUpEphemeral } = require("../../services/message");
const { respondWithChoices } = require("../../services/autocomplete");
const { findUserByDiscordId } = require("../../../db/services/userService");
const { facultyRole, courseAdminRole, githubRepo } = require("../../../../config.json");

const isCourseInstructor = (member) =>
  Boolean(member.roles?.cache?.some((role) => role.name.endsWith(` ${courseAdminRole}`)));

const getAccessLevel = async (member, models) => {
  const user = await findUserByDiscordId(member.user.id, models.User);
  if (user?.admin) return "admin";
  if (user?.faculty) return facultyRole;
  if (isCourseInstructor(member)) return courseAdminRole;
  return undefined;
};

const MESSAGE_LIMIT = 2000;

const formatCommands = (commands) =>
  commands.map((command) => `**${command.usage}** - ${command.description}`).join("\n");

const splitOversized = (section) => {
  const text = section.join("\n");
  return text.length > MESSAGE_LIMIT ? text.split("\n") : [text];
};

const packIntoMessages = (sections) =>
  sections.flatMap(splitOversized).reduce((messages, piece) => {
    const last = messages[messages.length - 1];
    if (last !== undefined && last.length + 1 + piece.length <= MESSAGE_LIMIT) {
      messages[messages.length - 1] = `${last}\n${piece}`;
    } else {
      messages.push(piece);
    }
    return messages;
  }, []);

const handleAllCommands = async (interaction, member, adminData, facultyData, courseAdminData, studentData) => {
  const userSections = [
    [`Hi **${member.displayName}**!\n`, "Here's a list of commands you can use:\n"],
    [
      "Category: **default**",
      formatCommands(studentData),
      `[User manual for students](<${githubRepo}/blob/main/documentation/usermanual-student.md>)`,
      "\n"
    ]
  ];
  const staffSections = [];

  if (adminData.size) {
    userSections.push(["Category: **admin**", formatCommands(adminData), "\n"]);
  }

  if (facultyData.size) {
    staffSections.push([
      `Category: **${facultyRole}**`,
      formatCommands(facultyData),
      `[User manual for faculty](<${githubRepo}/blob/main/documentation/usermanual-faculty.md>)`,
      "\n"
    ]);
  }

  if (courseAdminData.size) {
    staffSections.push([`Category: **${courseAdminRole}**`, formatCommands(courseAdminData), "\n"]);
  }

  const footer = [
    "*Commands can be used only in course channels",
    `\nYou can send \`/help [command name]\` to get info on a specific command!`
  ];
  (staffSections.length > 0 ? staffSections : userSections).push(footer);

  const [first, ...rest] = [...packIntoMessages(userSections), ...packIntoMessages(staffSections)];
  await editEphemeral(interaction, first);
  for (const message of rest) {
    await sendFollowUpEphemeral(interaction, message);
  }
};

const handleSingleCommand = async (interaction, member, commandsReadyToPrint) => {
  const name = interaction.options.getString("command");
  const command = commandsReadyToPrint.find((c) => c.data.name.replace("/", "") === name);

  if (!command) {
    return await editErrorEphemeral(interaction, "that's not a valid command!");
  }
  const data = [];
  data.push(`Hi **${member.displayName}**!\n`);
  data.push(`Command **${command.data.name}** info:\n`);
  data.push(`**Name:** ${command.data.name}`);
  data.push(`**Description:** ${command.description}`);
  data.push(`**Usage:** ${command.usage}`);
  return await editEphemeral(interaction, data.join(" \n"));
};

const isAdminOnly = (command) =>
  command.roles &&
  command.roles.includes("admin") &&
  !command.roles.includes(facultyRole) &&
  !command.roles.includes(courseAdminRole);

const getCommandsByCategory = (client, accessLevel) => {
  const adminData = client.slashCommands.filter((command) => isAdminOnly(command) && accessLevel === "admin");
  const seesStaffCommands = accessLevel === "admin" || accessLevel === facultyRole;
  const facultyData = client.slashCommands.filter(
    (command) => seesStaffCommands && command.roles && !isAdminOnly(command) && !command.roles.includes(courseAdminRole)
  );
  const courseAdminData = client.slashCommands.filter(
    (command) =>
      (seesStaffCommands || accessLevel === courseAdminRole) && command.roles && command.roles.includes(courseAdminRole)
  );
  const studentData = client.slashCommands.filter((command) => !command.roles && command.data.name !== "auth");
  return { adminData, facultyData, courseAdminData, studentData };
};

const execute = async (interaction, client, models) => {
  await sendEphemeral(interaction, "Hold on...");
  const member = interaction.member;
  const accessLevel = await getAccessLevel(member, models);
  const { adminData, facultyData, courseAdminData, studentData } = getCommandsByCategory(client, accessLevel);
  if (!interaction.options.getString("command")) {
    await handleAllCommands(interaction, member, adminData, facultyData, courseAdminData, studentData);
  } else {
    await handleSingleCommand(interaction, member, client.slashCommands);
  }
};

const autocomplete = async (interaction, client, models) => {
  const accessLevel = await getAccessLevel(interaction.member, models);
  const categories = getCommandsByCategory(client, accessLevel);
  const names = Object.values(categories)
    .flatMap((commands) => [...commands.keys()])
    .sort((a, b) => a.localeCompare(b));
  await respondWithChoices(
    interaction,
    names.map((name) => ({ name, value: name }))
  );
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Get info on how to use command(s).")
    .addStringOption((option) =>
      option.setName("command").setDescription("command instructions").setRequired(false).setAutocomplete(true)
    ),
  execute,
  autocomplete,
  usage: "/help <command name>",
  description: "Get info on how to use command(s)."
};

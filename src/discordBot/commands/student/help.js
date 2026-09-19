const { SlashCommandBuilder } = require("discord.js");
const { editEphemeral, editErrorEphemeral, sendEphemeral, sendFollowUpEphemeral } = require("../../services/message");
const { respondWithChoices } = require("../../services/autocomplete");
const { facultyRole, courseAdminRole, githubRepo } = require("../../../../config.json");

const getBestRole = (member) => {
  let highestRole = member.roles.highest.name;
  if (highestRole !== "admin" && highestRole !== `${facultyRole}`) {
    highestRole = member.roles.cache.find((r) => r.name.includes(courseAdminRole)) ? courseAdminRole : undefined;
  }
  return highestRole;
};

const handleAllCommands = async (interaction, member, adminData, facultyData, courseAdminData, studentData) => {
  const data = [];
  const data2 = [];
  data.push(`Hi **${member.displayName}**!\n`);

  data.push("Here's a list of commands you can use:\n");
  data.push("Category: **default**");
  data.push(studentData.map((command) => `**${command.usage}** - ${command.description}`).join("\n"));
  data.push(`[User manual for students](<${githubRepo}/blob/main/documentation/usermanual-student.md>)`);
  data.push("\n");

  if (adminData.size) {
    data.push("Category: **admin**");
    data.push(adminData.map((command) => `**${command.usage}** - ${command.description}`).join("\n"));
    data.push("\n");
  }

  if (facultyData.size) {
    data2.push(`Category: **${facultyRole}**`);
    data2.push(facultyData.map((command) => `**${command.usage}** - ${command.description}`).join("\n"));
    data2.push(`[User manual for faculty](<${githubRepo}/blob/main/documentation//usermanual-faculty.md>)`);
    data2.push("\n");
  }

  if (courseAdminData.size) {
    data2.push(`Category: **${courseAdminRole}**`);
    data2.push(courseAdminData.map((command) => `**${command.usage}** - ${command.description}`).join("\n"));
    data2.push("\n");
  }

  if (data2.length > 0) {
    data2.push("*Commands can be used only in course channels");
    data2.push(`\nYou can send \`/help [command name]\` to get info on a specific command!`);
    await editEphemeral(interaction, data.join("\n"));
    return await sendFollowUpEphemeral(interaction, data2.join("\n"));
  } else {
    data.push("*Commands can be used only in course channels");
    data.push(`\nYou can send \`/help [command name]\` to get info on a specific command!`);
    return await editEphemeral(interaction, data.join("\n"));
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

const getCommandsByCategory = (client, member) => {
  const highestRole = getBestRole(member);
  const adminData = client.slashCommands.filter((command) => isAdminOnly(command) && highestRole === "admin");
  const seesStaffCommands = highestRole === "admin" || highestRole === facultyRole;
  const facultyData = client.slashCommands.filter(
    (command) => seesStaffCommands && command.roles && !isAdminOnly(command) && !command.roles.includes(courseAdminRole)
  );
  const courseAdminData = client.slashCommands.filter(
    (command) => seesStaffCommands && command.roles && command.roles.includes(courseAdminRole)
  );
  const studentData = client.slashCommands.filter((command) => !command.roles && command.data.name !== "auth");
  return { adminData, facultyData, courseAdminData, studentData };
};

const execute = async (interaction, client) => {
  await sendEphemeral(interaction, "Hold on...");
  const guild = client.guild;
  const member = guild.members.cache.get(interaction.member.user.id);
  const { adminData, facultyData, courseAdminData, studentData } = getCommandsByCategory(client, member);
  if (!interaction.options.getString("command")) {
    await handleAllCommands(interaction, member, adminData, facultyData, courseAdminData, studentData);
  } else {
    handleSingleCommand(interaction, member, client.slashCommands);
  }
};

const autocomplete = async (interaction, client) => {
  const member = client.guild.members.cache.get(interaction.member.user.id);
  const categories = getCommandsByCategory(client, member);
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

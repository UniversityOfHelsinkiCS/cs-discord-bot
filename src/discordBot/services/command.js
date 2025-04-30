const fs = require("fs");
const { Collection } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { Routes } = require("discord-api-types/v9");
const clientId = process.env.BOT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.DISCORD_BOT_TOKEN;
const {
  findPrivateCoursesFromDb,
  findPublicCoursesFromDb,
  findLockedCoursesFromDb,
  findUnlockedCoursesFromDb,
  findCoursesFromDb,
} = require("../../db/services/courseService");
const { logError } = require("./logger");

const parseCourseData = (courseData) => {
  const choices = courseData.map((c) => {
    const regExp = /[^0-9]*/;
    const fullname = c.fullName.charAt(0).toUpperCase() + c.fullName.slice(1);
    const matches = regExp.exec(c.code)?.[0];
    const code = matches
      ? matches.toUpperCase() + c.code.slice(matches.length)
      : c.code;
    return {
      name: `${code} - ${fullname} - ${c.name}`,
      value: c.name,
    };
  });
  return choices;
};

const addOptions = async (command, obj, courseData) => {
  const parsedChoices = parseCourseData(courseData);
  parsedChoices.forEach((ch) => {
    try {
      obj.data.options[0].addChoice(ch.name, ch.value);
    } catch (e) {}
  });

  const options = obj.data.options;
  await command
    .edit({
      options: options,
    })
    .catch(console.error);
};

const updateDynamicChoices = async (client, commandNames, Course) => {
  const loadedCommands = await client.guilds.cache
    .get(guildId)
    ?.commands.fetch();
  const filteredCommands = await loadedCommands.filter((command) =>
    commandNames.includes(command.name)
  );
  filteredCommands.map(async (c) => {
    const obj = {
      data: new SlashCommandBuilder()
        .setName(c.name)
        .setDescription(c.description)
        .setDefaultPermission(!c.role)
        .addStringOption((option) =>
          option
            .setName(c.options[0].name)
            .setDescription(c.options[0].description)
            .setRequired(true)
        ),
    };
    if (obj.data.name === "join" || obj.data.name === "hide_course") {
      await addOptions(c, obj, (await findPublicCoursesFromDb("code", Course)).slice(0,24));
    } else if (obj.data.name === "leave") {
      await addOptions(c, obj, (await findCoursesFromDb("code", Course)).slice(0,24));
    } else if (obj.data.name === "unhide_course") {
      await addOptions(c, obj, (await findPrivateCoursesFromDb("code", Course)).slice(0,24));
    } else if (obj.data.name === "lock_chat") {
      await addOptions(c, obj, (await findUnlockedCoursesFromDb("code", Course)).slice(0,24));
    } else if (obj.data.name === "unlock_chat") {
      await addOptions(c, obj, (await findLockedCoursesFromDb("code", Course)).slice(0,24));
    }
  });
};

const deployCommands = async (commands) => {
  const rest = new REST({ version: "9" }).setToken(token);

  (async () => {
    try {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
      console.log("Successfully registered application commands.");
    } catch (error) {
      logError(error);
      console.error(error);
    }
  })();
};

const loadCommands = (client) => {
  const commands = [];
  client.commands = new Collection();
  const slashCommands = new Collection();
  const commandFolders = fs
    .readdirSync("./src/discordBot/commands/", { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  for (const folder of commandFolders) {
    const slashCommandFiles = fs
      .readdirSync(`./src/discordBot/commands/${folder}`)
      .filter((file) => file.endsWith(".js"));
    for (const file of slashCommandFiles) {
      const command = require(`../commands/${folder}/${file}`);
      if (command.prefix) {
        client.commands.set(command.name, command);
      } else {
        slashCommands.set(command.data.name, command);
        commands.push(command.data.toJSON());
      }
    }
    client.slashCommands = new Collection([...slashCommands.entries()].sort());
  }
  console.log("Successfully loaded all bot commands.");
  return commands;
};

const setUpCommands = async (client, Course) => {
  const commands = loadCommands(client);
  if (process.env.NODE_ENV === "production") await deployCommands(commands);
  await updateDynamicChoices(
    client,
    [
      "join",
      "leave",
      "hide_course",
      "unhide_course",
      "lock_chat",
      "unlock_chat",
    ],
    Course
  );
};

module.exports = {
  setUpCommands,
  updateDynamicChoices,
};

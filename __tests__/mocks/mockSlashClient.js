const Discord = require("discord.js");
const fs = require("fs");
const path = require("path");

let id = 1;
let roleId = 1;

const client = {
  slashCommands: new Discord.Collection(),
  user: {
    id: 1
  },
  guild: {
    invites: {
      cache: [],
      fetch: jest.fn(() => client.guild.invites.cache)
    },
    channels: {
      cache: new Discord.Collection(),
      create: jest.fn((options) =>
        client.guild.channels.cache.set(id, {
          name: options.name,
          type: options.type,
          send: jest.fn((content) => {
            return { content: content, pin: jest.fn() };
          }),
          lastPinTimestamp: null,
          setName: jest.fn(),
          createInvite: jest.fn((courseName) => {
            client.guild.invites.cache.set(id, {
              name: courseName,
              code: 1
            });
            id++;
          }),
          edit: jest.fn()
        })
      ),
      init: jest.fn(() => (client.guild.channels.cache = new Discord.Collection())),
      messages: {
        cache: [],
        fetchPins: jest.fn(() => ({ items: [] })),
        send: jest.fn()
      }
    },
    roles: {
      cache: new Discord.Collection(),
      create: jest.fn((data) => {
        client.guild.roles.cache.set(roleId, {
          name: data.name,
          id: data.id,
          members: data.members,
          delete: jest.fn()
        });
        roleId++;
      }),
      init: () => (client.guild.roles.cache = new Discord.Collection())
    },
    members: {
      me: { roles: ["admin"] },
      cache: new Discord.Collection(),
      fetch: jest.fn(() => {
        return client.guild.members.cache;
      })
    }
  },
  guilds: {
    fetch: jest.fn(() => client.guild)
  },
  emit: jest.fn()
};

const slashCommandsPath = path.resolve("src/discordBot/commands");

const slashCommandFolders = fs
  .readdirSync(slashCommandsPath, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name);
for (const folder of slashCommandFolders) {
  const slashCommandFiles = fs.readdirSync(`${slashCommandsPath}/${folder}`).filter((file) => file.endsWith(".js"));
  for (const file of slashCommandFiles) {
    const slashCommand = require(`${slashCommandsPath}/${folder}/${file}`);
    client.slashCommands.set(slashCommand.data.name, slashCommand);
  }
}

module.exports = {
  client
};

const { ChannelType } = require("discord.js");

const client = {
  user: {
    id: 1
  },
  guild: {
    invites: {
      cache: [],
      fetch: jest.fn(() => client.guild.invites.cache)
    },
    channels: {
      cache: [],
      create: jest.fn((options) =>
        client.guild.channels.cache.push({
          name: options.name,
          type: ChannelType.GuildText,
          send: jest.fn((content) => {
            return { content: content, pin: jest.fn() };
          }),
          lastPinTimestamp: null,
          createInvite: jest.fn(() =>
            client.guild.invites.cache.push({
              name: options.name,
              code: 1
            })
          )
        })
      ),
      messages: {
        cache: [],
        fetchPins: jest.fn(() => ({ items: [] })),
        send: jest.fn()
      }
    },
    roles: {
      cache: [],
      create: jest.fn((data) =>
        client.guild.roles.cache.push({
          name: data.name
        })
      )
    },
    members: {
      cache: [],
      fetch: jest.fn(() => {
        return client.guild.members.cache;
      })
    }
  },
  emit: jest.fn()
};

module.exports = {
  client
};

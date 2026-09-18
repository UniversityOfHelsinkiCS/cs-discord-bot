const { ChannelType, PermissionFlagsBits } = require("discord.js");
const { findOrCreateRoleWithName } = require("./service");
const { facultyRole, githubRepo } = require("../../../config.json");
const { updateGuide } = require("../../discordBot/services/guide");
const { setInitialHoneypotMessage, HONEYPOT_CHANNEL_NAME } = require("../../discordBot/services/honeypot");
const { startFirewallPruning } = require("../../discordBot/services/firewall");
const { initHooks } = require("../../db/hookInit");
const { sendPullDateMessage } = require("./message");

const findOrCreateChannel = async (channelObject, guild) => {
  const { name, options } = channelObject;
  const alreadyExists = guild.channels.cache.find(
    (c) => c.type === options.type && c.name.toLowerCase() === name.toLowerCase()
  );
  if (alreadyExists) {
    if (options?.topic && alreadyExists.topic !== options.topic && process.env.NODE_ENV === "production") {
      return await alreadyExists.setTopic(options.topic);
    }
    return alreadyExists;
  }
  return await guild.channels.create({ name, ...options });
};

const initChannels = async (guild, client) => {
  const admin = guild.roles.cache.find((r) => r.name === "admin");

  const channels = [
    {
      name: "commands",
      options: {
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel] },
          { id: client.user.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel] },
          { id: admin.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel] }
        ]
      }
    },
    {
      name: "guide",
      options: {
        type: ChannelType.GuildText,
        topic: `User manual for students: ${githubRepo}/blob/main/documentation/usermanual-student.md`,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.SendMessages], allow: [PermissionFlagsBits.ViewChannel] },
          { id: client.user.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel] }
        ]
      }
    },
    {
      name: HONEYPOT_CHANNEL_NAME,
      options: {
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: guild.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel] }
        ]
      }
    }
  ];
  await channels.reduce(async (promise, channel) => {
    await promise;
    await findOrCreateChannel(channel, guild);
  }, Promise.resolve());
};

const initRoles = async (guild) => {
  await findOrCreateRoleWithName(facultyRole, guild);
  await findOrCreateRoleWithName("admin", guild);
};

const setInitialGuideMessage = async (guild, channelName, models) => {
  console.log("Started initializing guide message");
  const guideChannel = guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.name === channelName);
  if (!guideChannel.lastPinTimestamp) {
    const msg = await guideChannel.send("initial");
    await msg.pin();
  }
  const invs = await guild.invites.fetch();
  const guideinvite = invs.find((invite) => invite.channel.name === "guide");
  if (!guideinvite) await guideChannel.createInvite({ maxAge: 0 });
  await updateGuide(guild, models);
  console.log("Guide message initialized and updated");
};

const initializeApplicationContext = async (client, models) => {
  initHooks(client.guild, models);
  await initRoles(client.guild);
  await initChannels(client.guild, client);
  setInitialGuideMessage(client.guild, "guide", models);
  setInitialHoneypotMessage(client.guild);
  startFirewallPruning();

  if (process.env.NODE_ENV === "production") {
    await sendPullDateMessage(client);
  }
};

module.exports = {
  initializeApplicationContext,
  initChannels,
  setInitialGuideMessage
};

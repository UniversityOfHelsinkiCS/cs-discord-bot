const { ChannelType, PermissionFlagsBits } = require("discord.js");
const axios = require("axios");
const { logError } = require("./logger");
const { findAllCourseNames, findCourseFromDb } = require("../../db/services/courseService");
const { courseAdminRole, facultyRole } = require("../../../config.json");

require("dotenv").config({ quiet: true });
const GUIDE_CHANNEL_NAME = "guide";

const invite_url =
  process.env.NODE_ENV === "production"
    ? `${process.env.BACKEND_SERVER_URL}`
    : `${process.env.BACKEND_SERVER_URL}:${process.env.PORT}`;

const cooldownMap = new Map();

const cooldownTimeMs = 1000 * 60 * 5;

/**
 *
 * @param {String} name
 */
const findOrCreateRoleWithName = async (name, guild) => {
  return (
    guild.roles.cache.find((role) => role.name === name) ||
    (await guild.roles.create({
      name
    }))
  );
};

const createCourseInvitationLink = (courseName) => {
  courseName = courseName.replace(/ /g, "%20").trim();
  return `Invitation link for the course <${invite_url}/join/${courseName}>`;
};

const createInvitation = async (guild, args) => {
  const guide = guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.name === "guide");
  const name = args;
  const category = guild.channels.cache.find(
    (c) =>
      c.type === ChannelType.GuildCategory && getCourseNameFromCategory(c.name.toLowerCase()) === name.toLowerCase()
  );
  let course;
  let invitationlink;
  if (args === GUIDE_CHANNEL_NAME) {
    course = guild.channels.cache.find((c) => c.parent === category);
    await guide.createInvite({ maxAge: 0, unique: true, reason: args });
    invitationlink = `Invitation link for the server <${invite_url}>`;
  } else {
    course = guild.channels.cache.find((c) => c.parent === category && c.name === `${name}_announcement`);
    invitationlink = createCourseInvitationLink(args);
  }
  const message = await course.send(invitationlink);
  await message.pin();
};

const findCategoryWithCourseName = (courseString, guild) => {
  try {
    const category = guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildCategory &&
        getCourseNameFromCategory(c.name.toLowerCase()) === courseString.toLowerCase()
    );
    return category;
  } catch (error) {
    logError(error);
    // console.log(error);
  }
};

const findChannelWithNameAndType = (name, type, guild) => {
  return guild.channels.cache.find(
    (c) => c.type === type && getCourseNameFromCategory(c.name.toLowerCase()) === name.toLowerCase()
  );
};

const findChannelWithId = (id, guild) => {
  return guild.channels.cache.get(id);
};

const msToMinutesAndSeconds = (ms) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const checkCourseCooldown = (courseName) => {
  return cooldownMap.get(courseName);
};

const handleCooldown = (courseName) => {
  if (!cooldownMap.has(courseName)) {
    cooldownMap.set(courseName, cooldownTimeMs + Date.now());
  }
  setTimeout(() => {
    cooldownMap.delete(courseName);
  }, cooldownTimeMs);
};

const getChannelObject = (roleName, channelName, category) => {
  roleName = roleName.replace(/ /g, "-");
  return {
    name: `${roleName}_${channelName}`,
    parent: category,
    options: { type: ChannelType.GuildText, parent: category, permissionOverwrites: [] }
  };
};

const findOrCreateChannel = async (channelObject, guild) => {
  const { name, options } = channelObject;
  const alreadyExists = guild.channels.cache.find(
    (c) => c.type === options.type && c.name.toLowerCase() === name.toLowerCase()
  );
  if (alreadyExists) {
    if (options?.topic && alreadyExists.topic !== options.topic) {
      return await alreadyExists.setTopic(options.topic);
    }
    return alreadyExists;
  }
  return await guild.channels.create({ name, ...options });
};

const fetchRegisteredCommands = async (client) => {
  return await client.guilds.cache.get(process.env.GUILD_ID).commands.fetch();
};

const deletecommand = async (client, commandToDeleteName) => {
  const commands = await fetchRegisteredCommands(client);
  const command = commands.find((c) => c.name === commandToDeleteName);
  if (command) {
    await command.delete();
  }
};

const emojiRegex = new RegExp(
  /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/gi
);

const containsEmojis = (text) => {
  const result = emojiRegex.test(text);
  emojiRegex.lastIndex = 0;
  return result;
};

const getCourseNameFromCategory = (category) => {
  let trimmedName = "";
  if (category.name) {
    trimmedName = category.name.replace(emojiRegex, "").trim();
  } else {
    trimmedName = category.replace(emojiRegex, "").trim();
  }
  return trimmedName;
};

const findAndUpdateInstructorRole = async (name, guild, adminRole) => {
  const oldInstructorRole = guild.roles.cache.find((role) => role.name !== name && role.name.includes(name));
  if (oldInstructorRole) {
    oldInstructorRole.setName(`${name} ${adminRole}`);
  }
};

const getWorkshopInfo = async (courseCode) => {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const url = `${process.env.WORKSHOPS_API}?from=${startDate.toISOString().split("T")[0]}&to=${endDate.toISOString().split("T")[0]}&courseCodes=${courseCode}`;

  try {
    const response = await axios.get(url);
    if (response.data.length === 0) {
      return "No workshops for this course. Please contact the course admin.";
    }
    let msg = "";
    response.data.forEach((s) => {
      const description = s.description !== null && s.description !== "" ? `Description: ${s.description}\n` : "\n";
      const startTime = s.startTime.split(":");
      const endTime = s.endTime.split(":");
      msg = msg.concat(`**${new Date(s.sessionDate).toLocaleString("en-US", { dateStyle: "full" })}**
      Between: ${startTime[0]}:${startTime[1]} - ${endTime[0]}:${endTime[1]}
      Location: ${s.instructionLocation.name}
      Instructor: ${s.user.fullName}
      ${description}`);
    });
    return msg;
  } catch (error) {
    logError(error);
    return;
  }
};

const listCourseInstructors = async (guild, roleString) => {
  const facultyRoleObject = await guild.roles.cache.find((r) => r.name === facultyRole);
  const instructorRole = await guild.roles.cache.find((r) => r.name === `${roleString} ${courseAdminRole}`);
  const members = guild.members.cache;
  let adminsString = "";

  members.forEach((m) => {
    const roles = m.roles.cache;
    if (roles.has(facultyRoleObject.id) && roles.has(instructorRole.id)) {
      if (adminsString === "") {
        adminsString = "<@" + m.user.id + ">";
      } else {
        adminsString = adminsString + ", <@" + m.user.id + ">";
      }
    }
  });

  members.forEach((m) => {
    const roles = m.roles.cache;
    if (!roles.has(facultyRoleObject.id) && roles.has(instructorRole.id)) {
      if (adminsString === "") {
        adminsString = "<@" + m.user.id + ">";
      } else {
        adminsString = adminsString + ", <@" + m.user.id + ">";
      }
    }
  });
  return adminsString;
};

const updateAnnouncementChannelMessage = async (guild, channelAnnouncement) => {
  if (!channelAnnouncement) return;
  const pins = await channelAnnouncement.messages.fetchPins();
  const invMessage = pins.items
    .map((pin) => pin.message)
    .find((msg) => msg.author.bot && msg.content.includes("Invitation link for"));
  if (!invMessage) return;
  const courseName = getCourseNameFromCategory(channelAnnouncement.parent);
  let updatedMsg = createCourseInvitationLink(courseName);
  const instructors = await listCourseInstructors(guild, courseName);
  if (instructors !== "") {
    updatedMsg = updatedMsg + "\nInstructors for the course:" + instructors;
  }
  await invMessage.edit(updatedMsg);
};

const updateInviteLinks = async (guild) => {
  const announcementChannels = guild.channels.cache.filter((c) => c.name.includes("announcement"));
  await Promise.all(
    announcementChannels.map(async (aChannel) => {
      await updateAnnouncementChannelMessage(guild, aChannel);
    })
  );
};

const isCourseCategory = async (channel, Course) => {
  if (channel && channel.name) {
    const course = await findCourseFromDb(getCourseNameFromCategory(channel.name), Course);
    return Boolean(course);
  }
};

const setCoursePositionABC = async (guild, courseString, Course) => {
  let first = 9999;
  const categoryNames = await findAllCourseNames(Course);
  categoryNames.sort((a, b) => a.localeCompare(b));
  const categories = [];
  categoryNames.forEach((cat) => {
    const guildCat = findCategoryWithCourseName(cat, guild);
    if (guildCat) {
      categories.push(guildCat);
      if (first > guildCat.position) first = guildCat.position;
    }
  });
  const course = courseString.split(" ")[1];

  const category = findCategoryWithCourseName(course, guild);
  if (category) {
    await category.edit({ position: categories.indexOf(category) + first });
  }
};

const getCategoryChannelPermissionOverwrites = (guild, admin, student) => [
  {
    id: guild.id,
    deny: [PermissionFlagsBits.ViewChannel]
  },
  {
    id: guild.members.me.roles.highest,
    allow: [PermissionFlagsBits.ViewChannel]
  },
  {
    id: admin.id,
    allow: [PermissionFlagsBits.ViewChannel]
  },
  {
    id: student.id,
    allow: [PermissionFlagsBits.ViewChannel]
  }
];

const getDefaultChannelObjects = async (guild, courseName, student, admin, category) => {
  courseName = courseName.replace(/ /g, "-");

  return [
    {
      name: `${courseName}_announcement`,
      options: {
        type: ChannelType.GuildText,
        description: "Messages from course admins",
        parent: category,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: student,
            deny: [PermissionFlagsBits.SendMessages],
            allow: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: admin,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
          }
        ]
      }
    },
    {
      name: `${courseName}_general`,
      parent: category,
      options: { type: ChannelType.GuildText, parent: category, permissionOverwrites: [] }
    },
    {
      name: `${courseName}_voice`,
      parent: category,
      options: { type: ChannelType.GuildVoice, parent: category, permissionOverwrites: [] }
    }
  ];
};

const getCategoryObject = (categoryName, permissionOverwrites) => ({
  name: `📚 ${categoryName}`,
  options: {
    type: ChannelType.GuildCategory,
    permissionOverwrites
  }
});

const getUserWithUserId = async (guild, userId) => {
  return await guild.members.cache.get(userId);
};

const changeCourseRoles = async (courseName, newValue, guild) => {
  await Promise.all(
    guild.roles.cache
      .filter((r) => r.name === `${courseName} ${courseAdminRole}` || r.name === courseName)
      .map(async (role) => {
        if (role.name.includes("instructor")) {
          role.setName(`${newValue} instructor`);
        } else {
          role.setName(newValue);
        }
      })
  );
};

const setEmojisLock = async (category, hidden, courseName) => {
  await category.setName(hidden ? `👻🔐 ${courseName}` : `📚🔐 ${courseName}`);
};

const setEmojisUnlock = async (category, hidden, courseName) => {
  await category.setName(hidden ? `👻 ${courseName}` : `📚 ${courseName}`);
};

const setEmojisHide = async (category, locked, courseName) => {
  await category.setName(locked ? `👻🔐 ${courseName}` : `👻 ${courseName}`);
};

const setEmojisUnhide = async (category, locked, courseName) => {
  await category.setName(locked ? `📚🔐 ${courseName}` : `📚 ${courseName}`);
};

module.exports = {
  findCategoryWithCourseName,
  findOrCreateRoleWithName,
  createInvitation,
  findChannelWithNameAndType,
  findChannelWithId,
  msToMinutesAndSeconds,
  checkCourseCooldown,
  handleCooldown,
  createCourseInvitationLink,
  findOrCreateChannel,
  fetchRegisteredCommands,
  deletecommand,
  getCourseNameFromCategory,
  findAndUpdateInstructorRole,
  listCourseInstructors,
  updateInviteLinks,
  containsEmojis,
  getUserWithUserId,
  getChannelObject,
  getCategoryChannelPermissionOverwrites,
  getDefaultChannelObjects,
  getCategoryObject,
  getWorkshopInfo,
  changeCourseRoles,
  updateAnnouncementChannelMessage,
  setEmojisLock,
  setEmojisUnlock,
  setEmojisHide,
  setEmojisUnhide,
  setCoursePositionABC,
  isCourseCategory
};

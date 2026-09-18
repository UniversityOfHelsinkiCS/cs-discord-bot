const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const {
  getAllCourses,
  saveCourseIdWithName,
  findCourseFromDbById,
  getCourseByDiscordId
} = require("../../../db/services/courseService");
const { getAllChannels, saveChannelIdWithName, getChannelByDiscordId } = require("../../../db/services/channelService");
const { getAllUsers, findUserByDbId } = require("../../../db/services/userService");
const { getAllMembers } = require("../../../db/services/courseMemberService");
const { confirmChoice } = require("../../services/confirm");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral } = require("../../services/message");
const {
  findOrCreateChannel,
  findOrCreateRoleWithName,
  getCategoryObject,
  getCategoryChannelPermissionOverwrites,
  createInvitation,
  updateAnnouncementChannelMessage,
  setCoursePositionABC
} = require("../../services/service");
const { updateGuide } = require("../../services/guide");
const { courseAdminRole, facultyRole } = require("../../../../config.json");

const execute = async (interaction, client, models) => {
  if (!(await requireAdmin(interaction, models))) return;

  await sendEphemeral(interaction, "Restore EVERYTHING from database?");

  const confirm = await confirmChoice(interaction, "Restore EVERYTHING from database?");
  if (!confirm) {
    return;
  }
  const confirm2 = await confirmChoice(interaction, "Are you ABSOLUTELY sure?");
  if (!confirm2) {
    return;
  }

  const guild = client.guild;
  await restoreCategories(guild, models);
  await restoreChannels(guild, models);
  await restorePermissions(guild, models);
  await restoreUsers(guild, models);
  await restoreCourseMembers(guild, models);
  await deleteExtraChannels(guild, models);

  await updateGuide(guild, models);

  return await editEphemeral(interaction, "Server restored from database.");
};

const restoreCategories = async (guild, models) => {
  const channelCache = guild.channels.cache;
  const allCourses = await getAllCourses(models.Course);

  for (const course in allCourses) {
    const currentCourse = allCourses[course];
    const student = await findOrCreateRoleWithName(currentCourse.name, guild);
    const admin = await findOrCreateRoleWithName(`${currentCourse.name} ${courseAdminRole}`, guild);
    const categoryFound = await channelCache.get(currentCourse.categoryId);

    if (categoryFound) {
      emojiName(currentCourse, currentCourse);
      await categoryFound.setName(currentCourse.name);
      await setCoursePositionABC(guild, currentCourse.name, models.Course);
    } else {
      let categoryObject = getCategoryObject(
        currentCourse.name,
        getCategoryChannelPermissionOverwrites(guild, admin, student)
      );
      categoryObject = emojiName(categoryObject, currentCourse);
      const category = await findOrCreateChannel(categoryObject, guild);
      await saveCourseIdWithName(category.id, currentCourse.name, models.Course);

      await setCoursePositionABC(guild, categoryObject.name, models.Course);
    }
  }
};

const restoreChannels = async (guild, models) => {
  const channelCache = guild.channels.cache;
  const allChannels = await getAllChannels(models.Channel);

  for (const channel in allChannels) {
    const currentChannel = allChannels[channel];
    const channelFound = await channelCache.get(currentChannel.discordId);

    if (channelFound) {
      channelFound.name = currentChannel.name;
      const parentChannel = await findCourseFromDbById(currentChannel.courseId, models.Course);
      await channelFound.setParent(parentChannel.categoryId);
    } else {
      const parentId = await findCourseFromDbById(currentChannel.courseId, models.Course);
      const parentChannel = await channelCache.get(parentId.dataValues.categoryId);
      const student = await findOrCreateRoleWithName(parentId.name, guild);
      const admin = await findOrCreateRoleWithName(`${parentId.name} ${courseAdminRole}`, guild);

      if (!currentChannel.voiceChannel) {
        let channelObject;
        if (currentChannel.name.includes("_announcement")) {
          channelObject = {
            name: currentChannel.name,
            parent: parentChannel,
            options: {
              type: ChannelType.GuildText,
              parent: parentChannel,
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
              ],
              topic: currentChannel.topic
            }
          };
        } else if (currentChannel.hidden) {
          channelObject = {
            name: currentChannel.name,
            parent: parentChannel,
            options: {
              type: ChannelType.GuildText,
              parent: parentChannel,
              permissionOverwrites: [
                {
                  id: guild.id,
                  deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                  id: student,
                  deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                },
                {
                  id: admin,
                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                }
              ],
              topic: currentChannel.topic
            }
          };
        } else {
          channelObject = {
            name: currentChannel.name,
            parent: parentChannel,
            options: {
              type: ChannelType.GuildText,
              parent: parentChannel,
              permissionOverwrites: [],
              topic: currentChannel.topic
            }
          };
        }

        const newChannel = await findOrCreateChannel(channelObject, guild);
        await saveChannelIdWithName(newChannel.id, currentChannel.name, models.Channel);

        if (newChannel.name.includes("_announcement")) {
          await createInvitation(guild, parentId.dataValues.name);
          await updateAnnouncementChannelMessage(guild, newChannel);
        }
      } else if (currentChannel.voiceChannel) {
        const channelObject = {
          name: currentChannel.name,
          parent: parentChannel,
          options: {
            type: ChannelType.GuildVoice,
            parent: parentChannel,
            permissionOverwrites: [],
            topic: currentChannel.topic
          }
        };

        const newChannel = await findOrCreateChannel(channelObject, guild);
        await saveChannelIdWithName(newChannel.id, currentChannel.name, models.Channel);
      }
    }
  }
};

const restorePermissions = async (guild, models) => {
  const channelCache = guild.channels.cache;
  const allCourses = await getAllCourses(models.Course);

  for (const course in allCourses) {
    const currentCourse = allCourses[course];
    const discordCategory = await channelCache.get(currentCourse.categoryId);
    if (currentCourse.locked) {
      discordCategory.permissionOverwrites.create(
        guild.roles.cache.find((r) => r.name.toLowerCase() === `${currentCourse.name}`),
        { ViewChannel: true, SendMessages: false }
      );
      discordCategory.permissionOverwrites.create(
        guild.roles.cache.find((r) => r.name.toLowerCase() === `${currentCourse.name} ${courseAdminRole}`),
        { ViewChannel: true, SendMessages: true }
      );
      discordCategory.permissionOverwrites.create(
        guild.roles.cache.find((r) => r.name === "faculty"),
        { SendMessages: true }
      );
      discordCategory.permissionOverwrites.create(
        guild.roles.cache.find((r) => r.name === "admin"),
        { SendMessages: true }
      );
    } else {
      discordCategory.permissionOverwrites.create(
        guild.roles.cache.find((r) => r.name.toLowerCase() === `${currentCourse.name}`),
        { ViewChannel: true, SendMessages: true }
      );
    }
  }
};

const restoreUsers = async (guild, models) => {
  const users = await getAllUsers(models.User);
  const adminRoleObject = await guild.roles.cache.find((r) => r.name === "admin");
  const facultyRoleObject = await guild.roles.cache.find((r) => r.name === facultyRole);

  for (const user in users) {
    const currentUser = users[user];
    const foundUser = await guild.members.cache.get(currentUser.discordId);
    if (foundUser) {
      await foundUser.roles.remove(foundUser.roles.cache);
      if (currentUser.admin) {
        await foundUser.roles.add(adminRoleObject);
      }
      if (currentUser.faculty) {
        await foundUser.roles.add(facultyRoleObject);
      }
    }
  }
};

const restoreCourseMembers = async (guild, models) => {
  const members = await getAllMembers(models.CourseMember);
  for (const member in members) {
    const currentMember = members[member];
    const user = await findUserByDbId(currentMember.userId, models.User);
    const course = await findCourseFromDbById(currentMember.courseId, models.Course);
    const instructor = currentMember.instructor;
    if (user) {
      const foundUser = await guild.members.cache.get(user.discordId);
      if (foundUser) {
        const courseRole = guild.roles.cache.find((r) => r.name === course.name);
        await foundUser.roles.add(courseRole);
        if (instructor) {
          const instructorRole = guild.roles.cache.find((r) => r.name === `${course.name} ${courseAdminRole}`);
          await foundUser.roles.add(instructorRole);
        }
      }
    }
  }
};

const deleteExtraChannels = async (guild, models) => {
  await Promise.all(
    guild.channels.cache.map(async (aChannel) => {
      if (aChannel.type !== ChannelType.GuildCategory) {
        const channelToRemove = await getChannelByDiscordId(aChannel.id, models.Channel);
        if (!channelToRemove) {
          if (aChannel.parent) {
            const parentId = aChannel.parent.id;
            const parent = await getCourseByDiscordId(parentId, models.Course);
            if (parent) {
              aChannel.delete();
            }
          }
        }
      }
    })
  );
};

const emojiName = (categoryObject, currentCourse) => {
  if (!currentCourse.locked && !currentCourse.private) {
    categoryObject.name = "📚 " + currentCourse.name;
  } else if (!currentCourse.locked && currentCourse.private) {
    categoryObject.name = "👻 " + currentCourse.name;
  } else if (currentCourse.locked && !currentCourse.private) {
    categoryObject.name = "📚🔐 " + currentCourse.name;
  } else if (currentCourse.locked && currentCourse.private) {
    categoryObject.name = "👻🔐 " + currentCourse.name;
  }
  return categoryObject;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("restore_server_from_database")
    .setDescription("Recreate Discord server from database")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute,
  usage: "/restore_server_from_database",
  description: "Recreate Discord server from database",
  roles: ["admin"]
};

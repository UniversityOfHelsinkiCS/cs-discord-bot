const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { createCourseMemberToDatabase } = require("../../../db/services/courseMemberService");
const { saveCourseIdWithName } = require("../../../db/services/courseService");
const { getCourseNameFromCategory, isCourseCategory } = require("../../services/service");
const { findCourseFromDb } = require("../../../db/services/courseService");
const {
  createChannelToDatabase,
  saveChannelIdWithName,
  findChannelFromDbByName
} = require("../../../db/services/channelService");
const { createUserToDatabase } = require("../../../db/services/userService");
const { facultyRole } = require("../../../../config.json");
const { requireAdmin } = require("../../services/permissions");
const { sendEphemeral, editEphemeral } = require("../../services/message");

const execute = async (interaction, client, models) => {
  if (!(await requireAdmin(interaction, models))) return;

  await sendEphemeral(interaction, "Updating database...");

  const guild = client.guild;
  const members = await guild.members.fetch();
  await saveChannelsToDb(models, guild);
  await saveChannelIdToDb(models, guild);
  await saveCategoryIdtoDb(models, guild);
  await saveUsersToDb(models, guild, members);
  await saveCourseMembersToDb(models, guild, members);

  return await editEphemeral(interaction, "Database updated.");
};

const saveChannelsToDb = async (models, guild) => {
  const channelCache = guild.channels.cache;
  const categoryChannels = [];

  await Promise.all(
    channelCache.map(async (c) => {
      if (await isCourseCategory(c, models.Course)) {
        categoryChannels.push(c.id);
      }
    })
  );

  const courseChannels = channelCache.filter((c) => categoryChannels.includes(c.parentId));
  const channelsAsArray = Array.from(courseChannels.values());

  for (const channel in channelsAsArray) {
    const currentChannel = channelsAsArray[channel];
    const courseIdentifier = getCourseNameFromCategory(currentChannel.parent);
    const course = await findCourseFromDb(courseIdentifier, models.Course);
    if (course) {
      const defaultChannel =
        currentChannel.name.includes("_general") ||
        currentChannel.name.includes("_announcement") ||
        currentChannel.type === ChannelType.GuildVoice;
      const voiceChannel = currentChannel.type === ChannelType.GuildVoice;

      const channelInstance = await findChannelFromDbByName(currentChannel.name, models.Channel);
      if (channelInstance) {
        channelInstance.set({
          defaultChannel: defaultChannel,
          voiceChannel: voiceChannel
        });
        channelInstance.save();
      } else {
        await createChannelToDatabase(
          {
            courseId: course.id,
            name: currentChannel.name,
            defaultChannel: defaultChannel,
            voiceChannel: voiceChannel
          },
          models.Channel
        );
      }
    }
  }
};

const saveChannelIdToDb = async (models, guild) => {
  const channelCache = guild.channels.cache;
  const categoryChannels = [];

  await Promise.all(
    channelCache.map(async (c) => {
      if (await isCourseCategory(c, models.Course)) {
        categoryChannels.push(c.id);
      }
    })
  );

  const courseChannels = channelCache.filter((c) => categoryChannels.includes(c.parentId));
  const channelsAsArray = Array.from(courseChannels.values());
  for (const channel in channelsAsArray) {
    const currentChannel = channelsAsArray[channel];
    const channelName = currentChannel.name;
    const channelId = currentChannel.id;
    await saveChannelIdWithName(channelId, channelName, models.Channel);
  }
};

const saveCategoryIdtoDb = async (models, guild) => {
  const channelCache = guild.channels.cache;
  const categoryChannels = [];

  await Promise.all(
    channelCache.map(async (c) => {
      if (await isCourseCategory(c, models.Course)) {
        categoryChannels.push(c);
      }
    })
  );
  for (const category in categoryChannels) {
    const currentCategory = categoryChannels[category];
    const categoryName = getCourseNameFromCategory(currentCategory);
    const categoryId = currentCategory.id;
    await saveCourseIdWithName(categoryId, categoryName, models.Course);
  }
};

const saveUsersToDb = async (models, guild, members) => {
  const roles = await guild.roles.fetch();
  const notBots = members.filter((u) => !u.user.bot);

  const adminRoleId = roles.find((r) => r.name === "admin")?.id;

  const facultyRoleId = roles.find((r) => r.name === facultyRole)?.id;

  await Promise.all(
    notBots.map(async (m) => {
      const u = m.user;
      const user = await createUserToDatabase(u.id, u.username, models.User);
      user.admin = m.roles.cache.has(adminRoleId);
      user.faculty = m.roles.cache.has(facultyRoleId);
      user.save();
    })
  );
};

const saveCourseMembersToDb = async (models, guild, members) => {
  const notBots = members.filter((u) => !u.user.bot);
  const channels = await guild.channels.fetch();
  const roles = await guild.roles.fetch();

  const courses = [];
  await Promise.all(
    channels.map(async (c) => {
      if (await isCourseCategory(c, models.Course)) {
        courses.push(getCourseNameFromCategory(c.name));
      }
    })
  );

  const instructorRoles = roles.filter((r) => r.name.includes("instructor"));
  const courseRoles = roles.filter((r) => courses.includes(r.name));

  await Promise.all(
    notBots.map(async (m) => {
      const coursesJoined = m.roles.cache.filter((role) => courseRoles.has(role.id)).map((role) => role.name);
      const instructorIn = m.roles.cache
        .filter((role) => instructorRoles.has(role.id))
        .map((role) => role.name.replace(" instructor", ""));

      const user = m.user;
      const userFromDb = await createUserToDatabase(user.id, user.username, models.User);

      for (const course in coursesJoined) {
        const courseFromDb = await findCourseFromDb(coursesJoined[course], models.Course);
        const courseMemberInstance = await createCourseMemberToDatabase(
          userFromDb.id,
          courseFromDb.id,
          models.CourseMember
        );

        courseMemberInstance.instructor = instructorIn.includes(coursesJoined[course]);
        await courseMemberInstance.save();
      }
    })
  );
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("update_database")
    .setDescription("Save existing channels to database.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute,
  usage: "/update_database",
  description: "Save existing channels to database.",
  roles: ["admin"]
};

const { Sequelize } = require("sequelize");
const { escapeLike } = require("./likePattern");

const findChannelFromDbByName = async (channelName, Channel) => {
  return await Channel.findOne({
    where: { name: { [Sequelize.Op.iLike]: escapeLike(channelName) } }
  });
};

const findChannelFromDbByDiscordId = async (discordId, Channel) => {
  return await Channel.findOne({
    where: { discordId: discordId }
  });
};

const createChannelToDatabase = async (channelAttributes, Channel) => {
  const alreadyinuse = await Channel.findOne({
    where: { name: { [Sequelize.Op.iLike]: escapeLike(channelAttributes.name) } }
  });
  if (!alreadyinuse) {
    await Channel.create(channelAttributes);
  }
};

const createDefaultChannelsToDatabase = async (channelObjects, Channel) => {
  await Channel.bulkCreate(channelObjects);
};

const removeChannelFromDb = async (channelName, Channel) => {
  const channel = await Channel.findOne({
    where: { name: { [Sequelize.Op.iLike]: escapeLike(channelName) } }
  });
  if (channel) {
    await Channel.destroy({
      where: { name: { [Sequelize.Op.iLike]: escapeLike(channelName) } }
    });
  }
};

const findChannelsByCourse = async (id, Channel) => {
  return await Channel.findAll({
    where: {
      courseId: id
    }
  });
};

const getAllChannels = async (Channel) => {
  return await Channel.findAll({
    attributes: ["id", "courseId", "name", "topic", "defaultChannel", "voiceChannel", "discordId"],
    raw: true
  });
};

const countChannelsByCourse = async (id, Channel) => {
  return await Channel.count({
    where: {
      courseId: id
    }
  });
};

const editChannelNames = async (courseId, previousCourseName, newCourseName, Channel) => {
  const channels = await findChannelsByCourse(courseId, Channel);
  await Promise.all(
    channels.map(async (channel) => {
      channel.name = channel.name.replace(previousCourseName, newCourseName);
      await channel.save();
    })
  );
};

const saveChannelTopicToDb = async (channelName, newTopic, Channel) => {
  const channel = await findChannelFromDbByName(channelName, Channel);

  if (channel) {
    channel.topic = newTopic;
    await channel.save();
  }
};

const editChannelName = async (discordId, newName, Channel) => {
  const channel = await findChannelFromDbByDiscordId(discordId, Channel);

  if (channel) {
    channel.name = newName;
    await channel.save();
  }
};

const getChannelByDiscordId = async (id, Channel) => {
  return await Channel.findOne({
    where: { discordId: id }
  });
};

const saveChannelIdWithName = async (id, channelName, Channel) => {
  await Channel.update({ discordId: id }, { where: { name: channelName } });
};

const editChannelHiddenStatus = async (discordId, hiddenStatus, Channel) => {
  const channel = await findChannelFromDbByDiscordId(discordId, Channel);

  if (channel) {
    channel.hidden = hiddenStatus;
    channel.bridged = !hiddenStatus;
    await channel.save();
  }
};

module.exports = {
  findChannelFromDbByName,
  findChannelFromDbByDiscordId,
  createChannelToDatabase,
  removeChannelFromDb,
  findChannelsByCourse,
  countChannelsByCourse,
  editChannelNames,
  createDefaultChannelsToDatabase,
  getChannelByDiscordId,
  saveChannelIdWithName,
  getAllChannels,
  editChannelName,
  saveChannelTopicToDb,
  editChannelHiddenStatus
};

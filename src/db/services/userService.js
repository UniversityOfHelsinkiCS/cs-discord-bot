const findUserByDiscordId = async (id, User) => {
  return await User.findOne({
    where:{
      discordId: id,
    },
  });
};

const findUserByDbId = async (id, User) => {
  return await User.findOne({
    where:{
      id: id,
    },
  });
};

const createUserToDatabase = async (discordId, username, User) => {
  const alreadyinuse = await findUserByDiscordId(discordId, User);
  if (!alreadyinuse) {
    return await User.create({ name: username, discordId: discordId });
  }
  return alreadyinuse;
};

const removeUserFromDb = async (discordId, User) => {
  const user = await findUserByDiscordId(discordId, User);
  if (user) {
    await User.destroy({
      where: {
        id: user.id,
      },
    });
  }
};

const saveFacultyRoleToDb = async (discordId, User) => {
  const user = await findUserByDiscordId(discordId, User);
  if (user) {
    await user.update({ faculty: true });
  }
};

const getAllUsers = async (User) => {
  return await User.findAll({
    attributes: ["name", "admin", "faculty", "discordId"],
    raw: true,
  });
};

const pruneUsersNotInGuild = async (guild, User) => {
  const users = await getAllUsers(User);
  const staleUsers = users.filter(u => !guild.members.cache.has(u.discordId));
  await Promise.all(staleUsers.map(u => removeUserFromDb(u.discordId, User)));
};

module.exports = {
  findUserByDiscordId,
  createUserToDatabase,
  removeUserFromDb,
  saveFacultyRoleToDb,
  findUserByDbId,
  getAllUsers,
  pruneUsersNotInGuild };
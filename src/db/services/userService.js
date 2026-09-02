const { blindIndex, decrypt } = require("../crypto");

const findUserByDiscordId = async (id, User) => {
  return await User.findOne({
    where:{
      discordIdHash: blindIndex(id),
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
  // raw: true bypasses the model getters, so decrypt the identity fields here.
  const rows = await User.findAll({
    attributes: ["name", "admin", "faculty", "discordId"],
    raw: true,
  });
  return rows.map((r) => ({ ...r, name: decrypt(r.name), discordId: decrypt(r.discordId) }));
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
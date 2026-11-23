const { blindIndex, decrypt } = require("../crypto");

const findUserByDiscordId = async (id, User) => {
  return await User.findOne({
    where: {
      discordIdHash: blindIndex(id)
    }
  });
};

const findUserByDbId = async (id, User) => {
  return await User.findOne({
    where: {
      id: id
    }
  });
};

const findUsersByDbIds = async (ids, User) => {
  return await User.findAll({
    where: {
      id: ids
    }
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
        id: user.id
      }
    });
  }
};

const saveFacultyRoleToDb = async (discordId, User) => {
  const user = await findUserByDiscordId(discordId, User);
  if (user) {
    await user.update({ faculty: true });
  }
};

const findDecryptedUsers = async (User, where) => {
  // raw: true bypasses the model getters, so decrypt the identity fields here.
  const rows = await User.findAll({
    attributes: ["name", "admin", "faculty", "discordId"],
    where,
    raw: true
  });
  return rows.map((r) => ({ ...r, name: decrypt(r.name), discordId: decrypt(r.discordId) }));
};

const getAllUsers = async (User) => findDecryptedUsers(User);

const getAdminUsers = async (User) => findDecryptedUsers(User, { admin: true });

const findUnusedUserIds = async (User, CourseMember) => {
  const memberships = await CourseMember.findAll({ attributes: ["userId"], raw: true });
  const userIdsWithCourses = new Set(memberships.map((m) => m.userId));
  const users = await User.findAll({ attributes: ["id", "admin", "faculty"], raw: true });
  return users.filter((u) => !u.admin && !u.faculty && !userIdsWithCourses.has(u.id)).map((u) => u.id);
};

const removeUserIfUnused = async (userId, User, CourseMember) => {
  const user = await findUserByDbId(userId, User);
  if (!user || user.admin || user.faculty) return;
  const membershipCount = await CourseMember.count({ where: { userId } });
  if (membershipCount === 0) await User.destroy({ where: { id: userId } });
};

const removeUsersByDbIds = async (ids, User) => await User.destroy({ where: { id: ids } });

module.exports = {
  findUserByDiscordId,
  createUserToDatabase,
  removeUserFromDb,
  saveFacultyRoleToDb,
  findUserByDbId,
  findUsersByDbIds,
  findUnusedUserIds,
  removeUsersByDbIds,
  removeUserIfUnused,
  getAllUsers,
  getAdminUsers
};

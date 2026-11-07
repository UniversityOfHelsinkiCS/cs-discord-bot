const {
  findUserByDiscordId,
  createUserToDatabase,
  removeUserFromDb,
  saveFacultyRoleToDb,
  findUserByDbId,
  getAdminUsers,
  pruneUsersNotInGuild,
  findUnusedUserIds,
  removeUsersByDbIds
} = require("../../../src/db/services/userService");
const { blindIndex, encrypt } = require("../../../src/db/crypto");

// The User model getters/setters (field encryption + discordIdHash) have no
// test-DB harness here; they are covered directly by db/crypto.test.js. These
// tests use plain object mocks, so create() is still asserted with the raw
// { name, discordId } the service passes in.

const userModelInstanceMock = {
  id: 1,
  name: "JonDoe",
  admin: false,
  faculty: false,
  discordId: 10,
  update: jest.fn()
};

const userModelMock = {
  findOne: jest.fn().mockResolvedValue(userModelInstanceMock),
  create: jest.fn().mockResolvedValue(userModelInstanceMock),
  destroy: jest.fn().mockResolvedValue(userModelInstanceMock),
  update: jest.fn().mockResolvedValue(userModelInstanceMock),
  findAll: jest.fn()
};

afterEach(() => {
  jest.clearAllMocks();
});

describe("userService", () => {
  test("find course member with discord id", async () => {
    await findUserByDiscordId(10, userModelMock);
    expect(userModelMock.findOne).toHaveBeenCalledTimes(1);
    expect(userModelMock.findOne).toHaveBeenCalledWith({
      where: { discordIdHash: blindIndex(10) }
    });
  });

  test("find user with id", async () => {
    await findUserByDbId(1, userModelMock);
    expect(userModelMock.findOne).toHaveBeenCalledTimes(1);
    expect(userModelMock.findOne).toHaveBeenCalledWith({
      where: { id: 1 }
    });
  });

  test("create user to database", async () => {
    userModelMock.findOne.mockResolvedValueOnce(null);
    await createUserToDatabase(12, "JaneDoe", userModelMock);
    expect(userModelMock.findOne).toHaveBeenCalledTimes(1);
    expect(userModelMock.findOne).toHaveBeenCalledWith({
      where: { discordIdHash: blindIndex(12) }
    });
    expect(userModelMock.create).toHaveBeenCalledTimes(1);
    expect(userModelMock.create).toHaveBeenCalledWith({
      name: "JaneDoe",
      discordId: 12
    });
  });

  test("create user to database won't save if already exists", async () => {
    const result = await createUserToDatabase(10, "JonDoe", userModelMock);
    expect(result).toBe(userModelInstanceMock);
    expect(userModelMock.findOne).toHaveBeenCalledTimes(1);
    expect(userModelMock.findOne).toHaveBeenCalledWith({
      where: { discordIdHash: blindIndex(10) }
    });
    expect(userModelMock.create).toHaveBeenCalledTimes(0);
  });

  test("remove user from database", async () => {
    await removeUserFromDb(10, userModelMock);
    expect(userModelMock.findOne).toHaveBeenCalledTimes(1);
    expect(userModelMock.findOne).toHaveBeenCalledWith({
      where: { discordIdHash: blindIndex(10) }
    });
    expect(userModelMock.destroy).toHaveBeenCalledTimes(1);
    expect(userModelMock.destroy).toHaveBeenCalledWith({
      where: { id: 1 }
    });
  });

  test("remove user from database won't remove if user doesn't exist", async () => {
    userModelMock.findOne.mockResolvedValueOnce(null);
    await removeUserFromDb(10, userModelMock);
    expect(userModelMock.findOne).toHaveBeenCalledTimes(1);
    expect(userModelMock.findOne).toHaveBeenCalledWith({
      where: { discordIdHash: blindIndex(10) }
    });
    expect(userModelMock.destroy).toHaveBeenCalledTimes(0);
  });

  test("add faculty role to database", async () => {
    await saveFacultyRoleToDb(10, userModelMock);
    expect(userModelMock.findOne).toHaveBeenCalledTimes(1);
    expect(userModelMock.findOne).toHaveBeenCalledWith({
      where: { discordIdHash: blindIndex(10) }
    });
    expect(userModelInstanceMock.update).toHaveBeenCalledTimes(1);
    expect(userModelInstanceMock.update).toHaveBeenCalledWith({
      faculty: true
    });
  });

  test("add faculty role to database won't save if user doesn't exist", async () => {
    userModelMock.findOne.mockResolvedValueOnce(null);
    await saveFacultyRoleToDb(10, userModelMock);
    expect(userModelMock.findOne).toHaveBeenCalledTimes(1);
    expect(userModelMock.findOne).toHaveBeenCalledWith({
      where: { discordIdHash: blindIndex(10) }
    });
    expect(userModelInstanceMock.update).toHaveBeenCalledTimes(0);
  });

  test("get admin users filters in the query and decrypts the identity fields", async () => {
    userModelMock.findAll.mockResolvedValueOnce([
      { name: encrypt("JonDoe"), discordId: encrypt("10"), admin: true, faculty: false }
    ]);

    const admins = await getAdminUsers(userModelMock);

    expect(userModelMock.findAll).toHaveBeenCalledTimes(1);
    expect(userModelMock.findAll).toHaveBeenCalledWith({
      attributes: ["name", "admin", "faculty", "discordId"],
      where: { admin: true },
      raw: true
    });
    expect(admins).toEqual([{ name: "JonDoe", discordId: "10", admin: true, faculty: false }]);
  });

  test("prune removes users no longer in the guild", async () => {
    userModelMock.findAll.mockResolvedValueOnce([{ discordId: 10 }, { discordId: 20 }, { discordId: 30 }]);
    userModelMock.findOne
      .mockResolvedValueOnce({ id: 2, discordId: 20 })
      .mockResolvedValueOnce({ id: 3, discordId: 30 });
    const guild = { members: { cache: new Map([[10, {}]]) } };

    await pruneUsersNotInGuild(guild, userModelMock);

    expect(userModelMock.destroy).toHaveBeenCalledTimes(2);
    expect(userModelMock.destroy).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(userModelMock.destroy).toHaveBeenCalledWith({ where: { id: 3 } });
  });

  test("prune removes nobody if everyone is still in the guild", async () => {
    userModelMock.findAll.mockResolvedValueOnce([{ discordId: 10 }]);
    const guild = { members: { cache: new Map([[10, {}]]) } };

    await pruneUsersNotInGuild(guild, userModelMock);

    expect(userModelMock.destroy).toHaveBeenCalledTimes(0);
  });
  test("unused users are those with no courses and no admin or faculty flag", async () => {
    const courseMemberModelMock = { findAll: jest.fn().mockResolvedValueOnce([{ userId: 1 }]) };
    userModelMock.findAll.mockResolvedValueOnce([
      { id: 1, admin: false, faculty: false },
      { id: 2, admin: true, faculty: false },
      { id: 3, admin: false, faculty: true },
      { id: 4, admin: false, faculty: false },
      { id: 5, admin: null, faculty: null }
    ]);

    const ids = await findUnusedUserIds(userModelMock, courseMemberModelMock);

    expect(ids).toEqual([4, 5]);
  });

  test("remove users by database ids", async () => {
    await removeUsersByDbIds([4, 5], userModelMock);

    expect(userModelMock.destroy).toHaveBeenCalledWith({ where: { id: [4, 5] } });
  });
});

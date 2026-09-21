const { facultyRole } = require("../../../config.json");

const initUserHooks = (guild, models) => {
  models.User.addHook("afterUpdate", async (user) => {
    const changedValue = user._changed;
    const userDiscoId = user.discordId;

    if (changedValue.has("admin")) {
      const adminRole = guild.roles.cache.find((r) => r.name === "admin");
      const userDisco = guild.members.cache.get(userDiscoId);
      if (user.admin) {
        userDisco.roles.add(adminRole);
      } else {
        userDisco.roles.remove(adminRole);
      }
    }

    if (changedValue.has("faculty")) {
      const facultyRoleObject = guild.roles.cache.find((r) => r.name === facultyRole);
      const userDisco = guild.members.cache.get(userDiscoId);
      if (user.faculty) {
        userDisco.roles.add(facultyRoleObject);
      } else {
        userDisco.roles.remove(facultyRoleObject);
      }
    }
  });
};

module.exports = { initUserHooks };

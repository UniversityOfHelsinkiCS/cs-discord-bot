const { updateGuide } = require("../services/service");
const {createUserToDatabase } = require("../services/userService")

const execute = async (member, client, models) => {
  await updateGuide(client.guild, models.Course);
  await createUserToDatabase(member.user.id, member.user.username, models.User)
};

module.exports = {
  name: "guildMemberAdd",
  execute,
};
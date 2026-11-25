const { removeDepartedMember } = require("../services/memberDeparture");

const execute = async (member, client, models) => {
  await removeDepartedMember(member.guild, member.user.id, models);
};

module.exports = {
  name: "guildMemberRemove",
  execute
};

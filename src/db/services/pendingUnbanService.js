const addPendingUnban = async (discordId, unbanAt, PendingUnban) => await PendingUnban.create({ discordId, unbanAt });

const removePendingUnban = async (id, PendingUnban) => await PendingUnban.destroy({ where: { id } });

const listPendingUnbans = async (PendingUnban) => await PendingUnban.findAll();

module.exports = { addPendingUnban, removePendingUnban, listPendingUnbans };

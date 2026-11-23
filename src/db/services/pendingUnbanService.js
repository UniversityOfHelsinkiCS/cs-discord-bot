const addPendingUnban = (discordId, unbanAt, PendingUnban) => PendingUnban.create({ discordId, unbanAt });

const removePendingUnban = (id, PendingUnban) => PendingUnban.destroy({ where: { id } });

const listPendingUnbans = (PendingUnban) => PendingUnban.findAll();

module.exports = { addPendingUnban, removePendingUnban, listPendingUnbans };

const { RESTJSONErrorCodes } = require("discord.js");
const { logError } = require("./logger");
const { addPendingUnban, removePendingUnban, listPendingUnbans } = require("../../db/services/pendingUnbanService");

const UNBAN_DELAY_MS = 60 * 1000;
const DELETE_MESSAGES_SECONDS = 24 * 60 * 60;
const KICK_RESULT = { kicked: "kicked", failed: "failed", alreadyKicking: "alreadyKicking" };
const KICK_FAILED_NOTE = "**Kick failed:** the ban did not go through, so the member is still on the server.";

const usersBeingKicked = new Set();

const isAlreadyUnbanned = (error) => error?.code === RESTJSONErrorCodes.UnknownBan;

const UNREACHABLE_BY_DM_CODES = [
  RESTJSONErrorCodes.CannotSendMessagesToThisUser,
  RESTJSONErrorCodes.CannotSendMessagesToThisUserDueToHavingNoMutualGuilds
];

const logUnlessUnreachableByDm = (error) => {
  if (!UNREACHABLE_BY_DM_CODES.includes(error?.code)) logError(error);
};

const unbanNow = async (guild, userId) => {
  try {
    await guild.members.unban(userId);
    return true;
  } catch (error) {
    if (isAlreadyUnbanned(error)) return true;
    logError(error);
    return false;
  }
};

const completeUnban = async (guild, userId, pendingUnban, models) => {
  const unbanned = await unbanNow(guild, userId);
  usersBeingKicked.delete(userId);
  if (unbanned && pendingUnban) await removePendingUnban(pendingUnban.id, models.PendingUnban).catch(logError);
};

const scheduleUnban = (guild, userId, unbanAt, pendingUnban, models) => {
  const delay = Math.max(0, unbanAt.getTime() - Date.now());
  setTimeout(() => completeUnban(guild, userId, pendingUnban, models), delay);
};

const resumePendingUnbans = async (guild, models) => {
  const pendingUnbans = await listPendingUnbans(models.PendingUnban).catch(logError);
  for (const pendingUnban of pendingUnbans ?? []) {
    scheduleUnban(guild, pendingUnban.discordId, new Date(pendingUnban.unbanAt), pendingUnban, models);
  }
};

const kickWithDm = async (guild, user, { reason, dm }, models) => {
  if (usersBeingKicked.has(user.id)) return KICK_RESULT.alreadyKicking;
  usersBeingKicked.add(user.id);
  await user.send(dm).catch(logUnlessUnreachableByDm);
  const banned = await guild.members
    .ban(user.id, { deleteMessageSeconds: DELETE_MESSAGES_SECONDS, reason })
    .catch(logError);
  if (!banned) {
    usersBeingKicked.delete(user.id);
    return KICK_RESULT.failed;
  }
  const unbanAt = new Date(Date.now() + UNBAN_DELAY_MS);
  const pendingUnban = await addPendingUnban(user.id, unbanAt, models.PendingUnban).catch(logError);
  scheduleUnban(guild, user.id, unbanAt, pendingUnban, models);
  return KICK_RESULT.kicked;
};

const withKickResult = (content, kickResult) =>
  kickResult === KICK_RESULT.failed ? `${content}\n${KICK_FAILED_NOTE}` : content;

const resetKickState = () => usersBeingKicked.clear();

module.exports = { KICK_RESULT, kickWithDm, withKickResult, resumePendingUnbans, resetKickState };

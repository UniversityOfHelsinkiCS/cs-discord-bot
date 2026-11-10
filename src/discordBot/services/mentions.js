const USER_MENTION_PATTERN = /<@!?(\d+)>/g;

const parseUserMentions = (text) => [...new Set([...text.matchAll(USER_MENTION_PATTERN)].map((match) => match[1]))];

const formatMentions = (userIds) => userIds.map((id) => `<@${id}>`).join(", ");

module.exports = { parseUserMentions, formatMentions };

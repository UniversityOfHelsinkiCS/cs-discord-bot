const version = "9";
const guildId = process.env.GUILD_ID;
const DISCORD_API = `https://discord.com/api/v${version}/guilds/${guildId}`;

const authorization_type = "Bot";
const authorization_token = process.env.DISCORD_BOT_TOKEN;

const getChannels = async () => {
  const response = await fetch(`${DISCORD_API}/channels`, {
    method: "GET",
    headers: {
      Authorization: `${authorization_type} ${authorization_token}`
    }
  });
  return response.json();
};

const ROLE_CACHE_MS = 60 * 1000;
let rolesRequest = null;
let rolesRequestedAt = 0;

const fetchRoles = async () => {
  const response = await fetch(`${DISCORD_API}/roles`, {
    method: "GET",
    headers: {
      Authorization: `${authorization_type} ${authorization_token}`
    }
  });
  if (!response.ok) throw new Error(`Fetching roles failed with status ${response.status}`);
  return response.json();
};

const getRoles = () => {
  if (!rolesRequest || Date.now() - rolesRequestedAt >= ROLE_CACHE_MS) {
    rolesRequestedAt = Date.now();
    rolesRequest = fetchRoles().catch((error) => {
      rolesRequest = null;
      throw error;
    });
  }
  return rolesRequest;
};

const clearRoleCache = () => {
  rolesRequest = null;
};

const addRole = async (user, role) => {
  await fetch(`${DISCORD_API}/members/${user.id}/roles/${role.id}`, {
    method: "PUT",
    headers: {
      Authorization: `${authorization_type} ${authorization_token}`
    }
  });
  return;
};

const getMember = async (id) => {
  const response = await fetch(`${DISCORD_API}/members/${id}`, {
    method: "GET",
    headers: {
      Authorization: `${authorization_type} ${authorization_token}`
    }
  });
  return response.json();
};

const addMember = async (user, role) => {
  const response = await fetch(`${DISCORD_API}/members/${user.id}`, {
    method: "PUT",
    headers: {
      Authorization: `${authorization_type} ${authorization_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ access_token: user.accessToken, roles: [role.id] })
  });
  return response.json();
};

module.exports = {
  getChannels,
  getRoles,
  clearRoleCache,
  addRole,
  getMember,
  addMember
};

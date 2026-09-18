const client = require("prom-client");

const joinedUsersCounter = new client.Counter({
  name: "joined_users_total",
  help: "Tracks the amount of joined users per course",
  labelNames: ["course"]
});

const resetCounters = () => {
  joinedUsersCounter.reset();
};

module.exports = {
  joinedUsersCounter,
  resetCounters
};

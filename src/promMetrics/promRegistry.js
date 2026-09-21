const promClient = require("prom-client");
const { joinedUsersCounter } = require("./promCounters");

const register = new promClient.Registry();
register.registerMetric(joinedUsersCounter);

module.exports = register;

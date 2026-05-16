const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "https://438034ff797683903b69e6672d2c5533@toska.it.helsinki.fi/29",
  enabled: (process.env.NODE_ENV === "production"),
});

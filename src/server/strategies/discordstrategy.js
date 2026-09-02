const DiscordStrategy = require("passport-discord").Strategy;
const passport = require("passport");

passport.serializeUser((user, done) => {
  // Keep the OAuth token out of the persisted session store. The token is still
  // available as req.user.accessToken during the login callback request itself
  // (passport sets req.user before calling serializeUser).
  const safe = { ...user };
  delete safe.accessToken;
  delete safe.refreshToken;
  delete safe.fetchedAt;
  done(null, safe);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(new DiscordStrategy({
  clientID: process.env.BOT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.DISCORD_REDIRECT_URL,
  scope: ["identify", "guilds.join"],
  store: true,
}, async (accessToken, refreshToken, profile, done) => {
  done(null, profile);
},
));
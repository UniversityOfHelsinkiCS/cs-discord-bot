const Sentry = require("@sentry/node");
const { createLogger, format, transports } = require("winston");

let logger;

const setupLogger = () => {
  if (process.env.NODE_ENV === "test") return;

  const errorStackTracerFormat = format((info) => {
    if (info.stack) {
      info.message = `${info.message} ${info.stack}`;
    }
    return info;
  });

  logger = createLogger({
    format: format.combine(
      format.errors({ stack: true }),
      format.splat(),
      format.colorize(),
      errorStackTracerFormat(),
      format.simple()
    ),
    transports: []
  });

  logger.add(
    new transports.Console({
      format: format.simple()
    })
  );
};

setupLogger();

// setupLogger() returns early under NODE_ENV=test, so `logger` can be undefined.
// logError is the path fatal startup failures report through, so it must never become
// the failure itself - a missing FIELD_ENCRYPTION_KEY reported as "cannot read
// properties of undefined" tells nobody anything.
const logError = (error) => {
  if (logger) logger.error(error);
  else console.error(error);
  Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
};

const logInfo = (message) => {
  if (logger) logger.info(message);
};

const describeInteraction = (client, interaction) => {
  const channel = client.guild.channels.cache.get(interaction.channelId) ?? interaction.channel;
  return {
    action: interaction.commandName ?? `button ${interaction.customId}`,
    channelName: channel?.name ?? interaction.channelId
  };
};

const logInteractionError = (error, client, interaction) => {
  const member = interaction.member;
  const { action, channelName } = describeInteraction(client, interaction);
  const msg = `ERROR DETECTED!\nMember: ${member?.displayName}\nCommand: ${action}\nChannel: ${channelName}`;
  logger.error(msg);
  logger.error(error);
  Sentry.withScope((scope) => {
    scope.setTag("command", action);
    scope.setUser({ id: interaction.user?.id, username: member?.displayName });
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
};

module.exports = {
  logError,
  logInteractionError,
  describeInteraction,
  logInfo
};

# Privacy Policy - CS Discord Bot

**Last updated:** 09-07-2026

This Privacy Policy describes what data the CS Discord Bot ("the Bot") collects, why, and how it is handled. The Bot is developed and operated for the Discord (and bridged Telegram) community of the Department of Computer Science, University of Helsinki. Source code: https://github.com/UniversityOfHelsinkiCS/cs-discord-bot

If you have questions about this policy or want to exercise any of the rights described below, contact a server administrator/moderator in the Discord server the Bot is installed in, or open an issue on the GitHub repository linked above.

## 1. Who operates the Bot

The Bot is maintained by student developers and staff associated with the University of Helsinki Department of Computer Science course/community it serves. It is not a commercial product and is not offered to the general public outside of the server it is explicitly installed in.

## 2. Data we collect

### 2.1 Collected automatically via Discord

- **Discord user ID, username, and tag** - collected for any member of a server the Bot is in, and for anyone who sends a message, reacts, or joins/leaves.
- **Server (guild) membership data** - via the Server Members intent, so the Bot can look up members, detect joins/leaves, and manage roles.
- **Message content** - read only in specific monitored channels (e.g., the general chat and a "honeypot" spam-trap channel) for spam/scam detection. Message text and attachment metadata (filename, file size, content type, image dimensions) are checked against known scam patterns.
- **Moderation actions** - bans, kicks, and the reason/context for them, tied to the acting bot and the affected user ID.

### 2.2 Stored in our database

We persist the following in a PostgreSQL database:

- **User records**: Discord ID, display name, and role flags (admin/faculty).
- **Course records**: course code/name, associated Discord category, and an optional linked Telegram chat ID (for the Discord↔Telegram bridge).
- **Course membership records**: links between users and courses, including instructor status.

We do **not** persistently store raw message content or attachment files in the database. Message/attachment data used for spam detection is held in memory temporarily (up to about one hour) and then discarded; it is not written to the database.

### 2.3 Telegram bridge

If a course channel is bridged to Telegram, messages sent in the linked Telegram chat (and the associated Telegram user identifiers) are relayed into the Discord channel, and vice versa, so that both groups can see the conversation. This data is not stored beyond what's needed to relay and display the message.

### 2.4 Website login (Discord OAuth)

If you log in through the Bot's companion website, we use Discord's OAuth with the `identify` and `guilds.join` scopes. This lets us read your basic Discord identity (ID, username) and, where used, add you to a server on your behalf after you authorize it. We do not request or receive your email address or Discord password.

### 2.5 Operational/diagnostic data

- **Error monitoring (Sentry)**: when the Bot encounters an error while processing a command, we send diagnostic information to Sentry, which can include the acting user's Discord ID and display name, the command name, and the error details.
- **Application logs**: operational logs (which may include Discord IDs and event details, but not full message content) may be sent to a log management service.
- **Usage metrics (Prometheus)**: aggregate, non-identifying usage/performance metrics may be collected for monitoring the Bot's health.

## 3. Why we collect this data

- To manage course-related roles, channels, and membership on the Discord server.
- To detect and respond to spam/scam activity (compromised-account image scams, honeypot-channel spam) in order to protect server members.
- To bridge conversations between linked Discord and Telegram channels for course communication.
- To let you log in to the companion website and, if you choose, join the associated server.
- To diagnose and fix bugs, and to monitor that the Bot is running correctly.

## 4. Legal basis (for GDPR purposes)

Where GDPR applies, our processing is based on:

- **Legitimate interest** - for moderation, spam/scam prevention, and keeping the service operational (error monitoring, logging).
- **Consent** - for the optional website OAuth login, granted when you authorize the Discord login prompt.
- **Contract/necessity** - for maintaining course rosters and channel access needed to provide the course community service.

## 5. Data storage and security

- Our database is hosted on our infrastructure and accessed only by the Bot service and designated administrators.
- Our infrastructure is encrypted at rest; data in transit to Discord, Telegram, and our database uses TLS/HTTPS.
- Access to the database, hosting platform, and third-party dashboards (Sentry, log management) is restricted to Bot and infrastructure maintainers.

## 6. Data retention

- **User records** are automatically deleted from our database when a member leaves, is kicked, or is banned from the Discord server, and also reconciled and cleaned up every time the Bot starts up (in case a departure happened while the Bot was offline).
- **Course and course-membership records** are retained for as long as the course/server integration is active, and are removed by administrators when no longer needed.
- **In-memory spam-detection data** (recent message/attachment fingerprints) is discarded automatically after about one hour, and entirely on Bot restart.
- **Diagnostic data sent to Sentry or log management** is retained according to those services' own retention settings, typically on the order of weeks to a few months.

## 7. Third parties we share data with

- **Discord** - the platform the Bot operates on; all interactions necessarily pass through Discord's API.
- **Telegram** - only for courses that enable the Discord↔Telegram bridge; messages and Telegram user identifiers pass through Telegram's platform.
- **Sentry** - error monitoring; may receive user IDs, usernames, and error context.
- **Log management service** - operational logs, which may include Discord IDs and event metadata.

We do not sell or use your data for advertising, and we do not share it with any party beyond what's listed above.

## 8. Your rights

You can ask a server administrator to:

- Tell you what data we hold about you.
- Correct inaccurate data (e.g., a course role assignment).
- Delete your data from our database (note: leaving the server already triggers automatic deletion of your user record).

If you are in the EU/EEA, you also have the rights granted under the GDPR (access, rectification, erasure, restriction, portability, and objection), which you can exercise using the same contact method.

## 9. Children's privacy

The Bot is intended for use by university students and staff and is not directed at children under 13. Discord's Term's of Service require people to be at least 13 years old. We do not knowingly collect data from children under 13. If we become aware of a user under 13 years old we'll promptly remove their data.

## 10. Changes to this policy

We may update this policy as the Bot's features change or laws require modifications to it. Material changes will be announced in the Discord server the Bot operates in. Continued use of the Bot after a change constitutes acceptance of the updated policy.

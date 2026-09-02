# Privacy Policy — CS Discord Bot

*Last updated: 2 September 2026. Full change history: https://github.com/UniversityOfHelsinkiCS/cs-discord-bot/commits/main/PRIVACY_POLICY.md*

This Privacy Policy describes what data the CS Discord Bot ("the Bot") collects, why, and how it is handled. The Bot is a private bot developed and operated for one specific Discord server, that of the Department of Computer Science, University of Helsinki ("the Server"). It is not offered to, or run in, any other server. Source code: https://github.com/UniversityOfHelsinkiCS/cs-discord-bot

If you have questions about this policy or want to exercise any of the rights described below, contact a server administrator in the Server, or open an issue on the GitHub repository linked above. For formal data-protection requests you may also contact the person responsible for register matters, Matti Luukkainen (matti.luukkainen@helsinki.fi) or the University of Helsinki Data Protection Officer at tietosuoja@helsinki.fi.

## 1. Who operates the Bot

The Bot is developed and run by the University of Helsinki's software development team (Toska) together with a contracted Discord administrator/developer, on behalf of the Department of Computer Science community it serves. It is not a commercial product, is not offered to the general public, and runs only in the Server.

- **Data controller:** University of Helsinki, Department of Computer Science (Tietojenkäsittelytieteen osasto), P.O. Box 68 (Pietari Kalmin katu 5), FI-00014 University of Helsinki
- **Person responsible for register matters:** Matti Luukkainen, matti.luukkainen@helsinki.fi
- **Data Protection Officer:** tietosuoja@helsinki.fi
- **Day-to-day contact:** a server administrator, or the GitHub repository above

## 2. Data we collect

### 2.1 Collected automatically via Discord

- **Discord user ID, username, and display name** - collected for any member of the Server, and for anyone who sends a message, reacts, or joins or leaves. Only the user ID and username are kept in the database (section 2.2); the display name appears only in error reports and logs (section 2.4), not the database. (Discord has retired the old four-digit discriminator/"tag" for most accounts; where an account still has one it may appear in logs.)
- **Server (guild) membership data** - via the Server Members intent, so the Bot can look up members, detect joins/leaves, and manage roles.
- **Message content** - the Bot receives message content through Discord's privileged Message Content intent for every channel it can see, but only *inspects* it as follows:
  - In the general chat channel and the "honeypot" spam-trap channel, message text is checked against known spam/scam patterns.
  - On messages that carry exactly four image attachments, in **any** channel, the images' dimensions are checked against known compromised-account scam fingerprints. Messages with any other number of images are received but their attachment metadata is not inspected.

  The message text and image dimensions used for these checks are not written to the database; text checked in the honeypot and chat channels is held only briefly in memory (see section 6).
- **Moderation actions** - kicks and bans issued by the Bot, and the reason/context for them, tied to the affected user ID. These are **not** written to any table in our database - there is no moderation-log table - so the automatic deletion that happens when you leave the Server (see section 6) does not reach them. The record of a moderation action lives in two other places instead:
  - **The administrator-only channel.** When the Bot acts automatically (see section 2.5), and also when it flags a message as *possibly* a scam without taking action, it posts a report into a private, administrator-only channel on the Server. For honeypot hits that report includes the triggering message's text and any attachment links; for image-scam hits it includes the attachment metadata and images. An administrator reviews these reports. Reports an administrator judges to be false positives are deleted within about 24 hours of that review. Reports for confirmed scam or spam activity are kept indefinitely in that channel as a security log and to help improve the detection rules.
  - **Logs and error monitoring.** A moderation event, or an error while carrying one out, may also produce a line in the Bot's console and operational logs, and - if it involved an error - an event in Sentry (see section 2.4). These are short-lived or kept per those services' own retention settings.

### 2.2 Stored in our database

We persist the following in a PostgreSQL database.

Records that relate to you as an individual:

- **User records** (`joined_users` table): your Discord user ID (`discordId`) and your Discord account username (`name`) - the account username, not your nickname on the Server - plus two booleans, `admin` and `faculty`, recording whether you hold the Server's admin or faculty role. Each row also has an internal ID and a creation timestamp.
- **Course membership records** (`coursemember` table): a row linking your user record to a course record, with an `instructor` boolean and a creation timestamp. Together these record which course roles you hold.
- **Website login sessions** (see section 2.3): stored server-side in this same database via the session store. A session record contains a session identifier and the Discord identity data returned during login - your Discord ID, username, and avatar, and this identity blob is encrypted (AES-256-GCM) at the application level before it is written. The OAuth access token issued for your login is used only transiently during the login request and is **not** written to the session store; no refresh token is stored. Sessions are removed when they expire or when you log out.

Records that describe the Server's course and channel structure, not individual people:

- **Course records** (`course` table): course code (`code`), full name (`fullName`), short name (`name`), the ID of the Discord category the course maps to (`categoryId`), and booleans for whether the course is hidden (`private`) or its chat is locked (`locked`).
- **Channel records** (`channel` table): for each course channel, its name (`name`), topic text (`topic`), Discord channel ID (`discordId`), the course it belongs to (`courseId`), and booleans marking it as the course's default channel (`defaultChannel`), a voice channel (`voiceChannel`), or hidden from regular users (`hidden`).

We do **not** persistently store raw message content or attachment files in the database. Message/attachment data used for spam detection is held in memory temporarily (up to about one hour) and then discarded. Note that automated-moderation reports posted into the administrator-only Discord channel (section 2.1) can contain message content and persist there as ordinary Discord messages under the retention described in that section.

### 2.3 Website login (Discord OAuth)

The Bot has a companion website, currently used to verify University faculty status and to hand out course-join links. If you log in through it, we use Discord's OAuth with the `identify` and `guilds.join` scopes: `identify` lets us read your basic Discord identity (ID, username, avatar), and `guilds.join` lets us add you to the Server with the appropriate course or faculty role after you authorize the login. We do not request or receive your email address or Discord password.

Faculty verification additionally relies on the University's single sign-on, which passes an employee-number attribute to the website. That attribute is used only to confirm that you are University staff at the moment of login; it is not stored or written to our logs.

Logging in sets a session cookie, and your session is stored server-side in our database (section 2.2), encrypted at the application level. The OAuth access token Discord issues is used during that same login request for the identity read and server-join described above and is then discarded. It is **not** persisted to the session store and no refresh token is stored. You can withdraw this consent at any time by logging out, and you can additionally revoke the application's access from the "Authorized Apps" section of your Discord account settings.

### 2.4 Operational/diagnostic data

- **Error monitoring (Sentry)**: when the Bot hits an error or unhandled exception anywhere in its operation - processing a command, handling a Discord event, or carrying out a moderation action - it sends diagnostic information to Sentry. This can include the acting or affected user's Discord ID and display name, the command or event name, and the error message and stack trace.
- **Application logs**: the Bot writes operational logs to its own console/host (which may include Discord IDs and event details, but not full message content). These are additionally forwarded to the Papertrail (SolarWinds) log-management service only when a Papertrail endpoint is configured for the running deployment, which may not be the case at any given time.
- **Usage metrics (Prometheus)**: the Bot's web component exposes a `/metrics` endpoint with aggregate counters (for example, the number of course joins per course) for external Prometheus-based monitoring infrastructure to scrape. These counters contain no usernames, user IDs, or message content.

### 2.5 Automated moderation decisions

To protect members from compromised-account scams and spam bots, the Bot can remove a member **automatically, without prior human review**. Removal is carried out as a ban immediately followed by an unban - in effect a kick that also deletes up to about 24 hours of that account's recent messages from the Server. This happens when:

- a message carrying exactly four image attachments matches a known compromised-account scam fingerprint (the match is on the images' dimensions);
- the same message is posted in both the honeypot channel and the general chat channel within about an hour; or
- an account posts in the honeypot channel more than once within about an hour.

The affected account receives a direct message explaining what happened (for a suspected compromise, that message recommends a password reset and a malware scan). These actions are **reversible**: you are not permanently banned and may rejoin immediately. If you believe an action was a mistake, you can ask a human administrator to review it (see section 8). Because a removal is undone at once, leaves no lasting ban, and only clears up to about 24 hours of recent messages - and the Server is used only for course questions and community chat, so those messages are limited to that context - we do not consider it to produce legal effects concerning you or to affect you similarly significantly, and we therefore treat Article 22 GDPR (solely automated decisions with legal or similarly significant effect) as not applying to it. The offer of human review above is made as a matter of good practice, not because that Article requires it.

## 3. Why we collect this data

- To manage course-related roles, channels, and membership on the Server.
- To detect and respond to spam/scam activity (compromised-account image scams, honeypot-channel spam) in order to protect members of the Server.
- To let you verify faculty status or use a course-join link on the companion website, and to add you to the Server with the right role.
- To diagnose and fix bugs, and to monitor that the Bot is running correctly.

## 4. Legal basis (for GDPR purposes)

The University of Helsinki is a public body. Where GDPR applies, our processing is based on:

- **Performance of a task carried out in the public interest (Art. 6(1)(e))** - for managing course rosters, roles, and channels, and for the companion website login and faculty verification (including the University single sign-on employee-number check) that support the department's teaching and community activities.
- **Legitimate interests (Art. 6(1)(f))** - for spam/scam detection and moderation (protecting members and their accounts), for keeping confirmed scam or spam content as a security log and to improve that detection, and for error monitoring, logging, and metrics (keeping the service secure and operational). We rely on this only for activity that is ancillary to, rather than part of, the University's statutory tasks. You may object to this processing at any time (see section 8), and we will stop unless we have overriding legitimate grounds.
- **Consent (Art. 6(1)(a))** - for the optional website OAuth login, given when you authorize the Discord login prompt. You can withdraw it at any time by logging out and revoking the app's access in your Discord settings; withdrawal does not affect processing carried out beforehand.

## 5. Data storage and security

- Our database is hosted on our infrastructure and accessed only by the Bot service and designated administrators.
- **Encryption of identity data.** In the `joined_users` table your Discord user ID and username are encrypted with AES-256-GCM at the application level before they are written, and a keyed HMAC-SHA256 index of the user ID is stored alongside so the Bot can still look you up by exact ID and enforce uniqueness without holding the ID in the clear. Website login sessions are encrypted the same way. The encryption key is held only in the running service's environment, separately from the database and any backups. Data in transit to Discord and to our database uses TLS/HTTPS.
- **What this protects, and what it does not.** We hold this data as a persistent, queryable compilation; who is on the Server, under what username, in which courses, since when, and with what privileges. We treat that compilation as carrying more risk than the same facts glanced at in the Discord client, which is why the identity fields are encrypted. Application-level encryption does not hide everything: the number of rows still approximates the Server's member count and row timestamps still show roughly when each person joined and in what order. The shape of the course-membership graph is still visible to someone with database access, and copies of data in transaction logs, temporary files, and database statistics aren't protected. The `admin` and `faculty` flags, internal row IDs, join timestamps, and the course-membership links themselves are stored without application-level encryption.
- Access to the database, hosting platform, and third-party dashboards (Sentry, log management) is restricted to Bot and infrastructure maintainers.

## 6. Data retention

- **User records** are automatically deleted from our database when a member leaves, is kicked, or is banned from the Server, and also reconciled and cleaned up every time the Bot starts up (in case a departure happened while the Bot was offline).
- **Course-membership records** for a user are deleted together with that user's record; the database removes them automatically when the user record is deleted.
- **Course and channel records** are retained for as long as the course exists on the Server, and are removed by administrators when the course or channel is deleted or no longer needed. They contain no personal data about individual members.
- **Website sessions** are removed when they expire or when you log out.
- **Database backups.** We do not keep separate database backups. A deletion from the live database is immediate and permanent, with no copy retained elsewhere.
- **In-memory spam-detection data**: the recent message and attachment fingerprints, the list of accounts that have posted in the honeypot channel, and the per-account report cooldowns are all held only in memory and discarded automatically about one hour after the event they relate to. All in-memory state is also cleared whenever the Bot restarts.
- **Automated-moderation reports** in the administrator-only Discord channel: reports an administrator judges to be false positives are deleted within about 24 hours of that review. Reports for confirmed scam or spam activity are kept indefinitely as a security log and to improve the detection rules; these concern abusive or compromised accounts and the content they posted.
- **Diagnostic data sent to Sentry or Papertrail** is retained according to those services' own retention settings, typically on the order of weeks to a few months.

## 7. Third parties and international transfers

The Bot relies on the following external processors and platforms:

- **Discord** - the platform the Bot operates on; all interactions necessarily pass through Discord's API.
- **Sentry** - error monitoring; may receive user IDs, usernames, and error context.
- **Papertrail (SolarWinds)** - log management; receives Discord IDs and event metadata only when log forwarding is enabled for the deployment (see section 2.4).
- **Prometheus monitoring** - external monitoring infrastructure scrapes the Bot's `/metrics` endpoint (section 2.4). Only aggregate, non-identifying counters are exposed, so no personal data is shared this way.

Some of these providers (Discord, Sentry, and Papertrail) are established outside the EU/EEA, primarily in the United States. Where data is transferred outside the EEA, the transfer relies on the European Commission's adequacy decision for the EU–US Data Privacy Framework where the provider is certified under it, and otherwise on the European Commission's Standard Contractual Clauses, as set out in each provider's own data-processing terms.

We do not sell or use your data for advertising, and we do not share it with any party beyond what's listed above.

## 8. Your rights

You can ask a server administrator, the person responsible for register matters, Matti Luukkainen (matti.luukkainen@helsinki.fi) (or the University of Helsinki Data Protection Officer, tietosuoja@helsinki.fi) to:

- Tell you what data we hold about you.
- Correct inaccurate data (e.g., a course role assignment).
- Delete your data from our database (note: leaving the Server already triggers automatic deletion of your user record).
- Restrict or object to processing based on legitimate interests, including automated spam/scam moderation.
- Have a human administrator review an automated moderation action taken against you (see section 2.5).

If you are in the EU/EEA, you also have the rights granted under the GDPR (access, rectification, erasure, restriction, and objection), which you can exercise using the same contact method. The right to **data portability** applies only to data we process on the basis of your consent - in practice the Discord identity data tied to your website login (section 2.3) - and not to the course, role, and moderation data we process in the public interest or our legitimate interests. You also have the right to lodge a complaint with your local supervisory authority; in Finland this is the Office of the Data Protection Ombudsman (Tietosuojavaltuutetun toimisto, https://tietosuoja.fi).

## 9. Children's privacy

The Bot is intended for use by university students and staff and is not directed at children under 13. Discord's Terms of Service require people to be at least 13 years old, which is also the age of consent for information-society services under Finnish data-protection law. We do not carry out separate age verification, we do not knowingly collect data from children under 13, and if we become aware of a user under 13 we will promptly remove their data.

## 10. Changes to this policy

We may update this policy as the Bot's features change or laws require modifications to it. Material changes will be announced in the Server. The date at the top of this document reflects the current version, and every past version is available in the change history linked there. Continued use of the Bot after a change is subject to the updated policy.

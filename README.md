# CS DISCORD BOT

[![MIT license](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Course-management Discord bot for the University of Helsinki Department of
Computer Science server. Students self-serve into the right course channels;
faculty get tools to create and run those channels. Backed by PostgreSQL and a
small companion website used for faculty verification and course-join links.

## The server

The server is the shared Discord home for the Department of Computer Science at
the University of Helsinki. It hosts channels for courses where students ask for
help and talk with peers, volunteer instructors, and faculty; Discord activity is
voluntary and complements official teaching. Students pick up only the courses
they want with the `#guide` channel or with the`/join` command, keeping their channel list manageable. Faculty run
their own course spaces, and admins moderate guild-wide.

Invite: https://discord.gg/V5R9dZFCkD

## What our bot does

### Course discovery and enrollment (all users)

- `/join` and `/leave` — pick a course from a menu; the bot grants or removes the
  course role, opens or closes the matching channels, and updates the
  course-membership record in the database.
- `/courses` lists public courses, `/instructors` lists a course's instructors,
  `/help` shows a role-aware command list.
- A **guide** channel is generated automatically and kept in sync with the
  current course list so newcomers can find channels without commands.
- Course-page links on the companion website route through `/join/:course` and
  drop the user straight into that course.

### Faculty tools (slash commands, gated by a faculty role)

- Course lifecycle: `/create_course`, `/edit_course`, `/hide_course` /
  `/unhide_course`, `/lock_chat` / `/unlock_chat`, `/create_channel`,
  `/rename_channel`, `/hide_channel` / `/unhide_channel`, `/delete_channel`,
  `/edit_topic`.
- Roles: `/add_instructors`, `/remove_instructors` for per-course instructor
  (volunteer TA) roles.
- `/status` — course summary (code, full name, invite link, instructors, member
  count, join trends). `/create_poll` — reaction poll.
- `/auth` — issues a one-time link to the companion website, where a faculty
  member logs in with Discord OAuth and the university single sign-on
  (employee-number check) to be granted the faculty role.

### Admin tools (`!` prefix commands, run in the staff `#commands` channel)

- `!add_admin_rights` / `!remove_admin_rights`, `!remove_faculty_rights`.
- `!reload_commands` and slash-command registration / permission management.
- `!fix_course_roles` — reconciles Discord course roles against the database in
  both directions. `!update_instructors`, `!update_invitelinks`, `!sort_courses`.
- `!update_database` + `!restore_server_from_database` — snapshot the server's
  courses, roles, and memberships to the database and rebuild them; used for
  recovery and migrations.

### Membership sync

- On join, the bot creates the user's database record and refreshes the guide; on
  leave, it deletes the user record and their course-membership rows.
- Identity fields (`name`, Discord ID) are encrypted at rest with AES-256-GCM,
  with an HMAC blind-index column for exact-match lookups. See
  [Field encryption](#field-encryption).

### Spam / scam protection (automated moderation)

- **Honeypot channel:** anyone posting in the hidden "do not post here" channel
  is reported to staff, and posting the same content in both the honeypot and the
  public chat channel triggers an automatic kick (ban immediately followed by an
  unban, which also purges ~24 h of that account's recent messages).
- **Compromised-account image scams:** messages carrying four images are checked
  against known scam image-dimension fingerprints; on a match the message is
  deleted, the account is kicked, and the user is DM'd recovery instructions.
  Staff receive a report in `#commands` either way.

### Telegram bridge (opt-in per channel)

- Faculty link a course text channel to a Telegram group with `/enable_bridge` /
  `/disable_bridge`. Messages (text and media) are then relayed both directions,
  with Discord mentions and emoji rendered to plain text.

### Metrics

- Join/leave counts and per-course trends are exposed for a Grafana dashboard and
  surfaced in `/status`.

## Data storage

- PostgreSQL tables only for `User`, `Course`, `Channel`, and `CourseMember`.
- **No message content is persisted.** Chat text is used transiently for command
  parsing, spam detection (in memory, 1-hour TTL), staff reports, and Telegram
  relay.

## Gateway intents

| Intent | Why |
| --- | --- |
| Guilds | Channel, role, and guild state. |
| **Guild Members** (privileged) | Join/leave events drive database sync and role management; `!fix_course_roles` and server restore enumerate all members; spam protection acts on member accounts. |
| **Message Content** (privileged) | Parse `!` prefix commands and copy-pasted `/join`; compare message text for spam/scam detection; relay text over the Telegram bridge. |
| Guild Webhooks, Guild Invites | Course invite-link management and channel webhooks. |
| Guild Messages, Guild Message Reactions | Command handling, polls, confirmations. |
| Guild Voice States | Voice-channel state used by course channels. |

The Guild Presences intent is **not** used.

## Documentation

- [User manual — student](./documentation/usermanual-student.md)
- [User manual — instructor](./documentation/usermanual-instructor.md)
- [User manual — faculty](./documentation/usermanual-faculty.md)
- [User manual — admin](./documentation/usermanual-admin.md)
- [Command reference](./documentation/commands.md)
- [Privacy policy](./PRIVACY_POLICY.md) · [Terms of service](./TERMS_OF_SERVICE.md)

### Deployment / setup

- [Create the Discord server](./documentation/discordserver.md)
- [Create and configure the bot](./documentation/setupmainbot.md)
- [Companion website OAuth2 backend](./documentation/OAuth2.md)
- [Telegram bridge setup](./documentation/telegram.md) (The bridge is getting removed soon)
- [CI/CD pipeline](./documentation/ci-cd-pipeline.md)

## Running locally

Clone the repository and install dependencies:

```
npm install
```

Add a `.env` file to the repository root (same directory as `package.json`):

```
PREFIX=!
DISCORD_BOT_TOKEN=your-own-token
GUILD_ID=your-discord-server-id
BOT_ID=id-of-your-bot
CLIENT_SECRET=your-client-secret
DISCORD_REDIRECT_URL=your-client-oauth2-redirect-url-with-identify-guilds.join
DISCORD_SERVER_INVITE=your-discord-server-invite
DISCORD_WEBHOOK_URL=base-discord-webhook-url-without-id-or-token (e.g. https://discord.com/api/webhooks)
DISCORD_WEBHOOK_TOKEN=token-of-that-webhook (used by the /webhooks proxy route to post embeds into a channel)
PORT=your-custom-backend-port
SESSION_SECRET=server-session-secret
FIELD_ENCRYPTION_KEY=32-random-bytes-base64
BACKEND_SERVER_URL=backend-server-url-without-port
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
GRAFANA_TOKEN=your-grafana-authorization-token
GRAFANA_URL=your-server-url/grafana/your-dashboard-specific-stuff
GRAFANA_PANEL_ID=your-grafana-panel-id
PAPERTRAIL_URL=papertrailapp-url
WORKSHOPS_API=pajat-api-url

# Bridge
TELEGRAM_BOT_TOKEN=telegram-bridge-bot-token
TG_BRIDGE_ENABLED=true
```

Add a `config.json` file:

```
courseAdminRole: course-admin-role-name
facultyRole: teacher-role-name
```

Install PostgreSQL ([download](https://www.postgresql.org/download/)) and create
the database referenced by `DATABASE_URL`. Migrations, including the identity
encryption migration, run automatically on startup.

Start the bot:

```
npm run dev     # development
npm start       # staging
npm test        # run all tests
```

## Field encryption

`joined_users.name` / `discordId` and the website session store are encrypted at
rest at the application layer with AES-256-GCM, keyed by `FIELD_ENCRYPTION_KEY`
(32 bytes, base64). A `discordIdHash` column (HMAC-SHA256 of the Discord ID) is
the blind index used for exact-match lookups and uniqueness. Every ciphertext
carries a `v1:` prefix so a future key rotation can add `v2:` and re-encrypt in
place.

Generate a key with `openssl rand -base64 32` (or
`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` if
openssl isn't available) — don't hand-type one, since the decoded length is the
only thing validated and a weak key still passes that check.

The key lives only in the service environment; store it separately from any
database backup. **Losing `FIELD_ENCRYPTION_KEY` makes `name` / `discordId`
unrecoverable** — the only recovery is to truncate `joined_users` and rebuild
from Discord with `!update_database` + `!restore_server_from_database`
(course-membership history is lost). To roll the migration back (key still
present): `NODE_ENV=production node src/db/rollback.js`.

## License

[MIT](LICENSE)

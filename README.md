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
  current course list, sorted by full name. Each course has **Join** and **Leave**
  buttons, so newcomers can join channels without commands. The member counts
  refresh every hour and whenever a course changes.
- Course-page links on the companion website route through `/join/:course` and
  drop the user straight into that course.

### Faculty tools (slash commands, gated by the faculty flag in the database)

Like admin commands, faculty commands are hidden from the command picker until the faculty, `admin` and `cs-admin`
roles are allowed for them in Discord's Integrations settings.

- Course lifecycle: `/create_course`, `/edit_course`, `/hide_course` /
  `/unhide_course`, `/lock_chat` / `/unlock_chat`, `/create_channel`,
  `/rename_channel`, `/hide_channel` / `/unhide_channel`, `/delete_channel`,
  `/edit_topic`.
- Roles: `/add_instructors`, `/remove_instructors` for per-course instructor
  (volunteer TA) roles.
- `/status` — course summary (code, full name, invite link, instructors, member
  count). `/create_poll` — reaction poll.
- `/auth` — replies with the link to the companion website, where a faculty
  member logs in with Discord OAuth and the university single sign-on
  (employee-number check) to be granted the faculty role.

### Admin tools (slash commands, admin only)

Admin commands run only for users with the admin flag in the database, and are hidden from the command picker
until the `admin` / `cs-admin` roles are granted access in Discord's Integrations settings. Their replies are
visible only to the person who ran them.

- `/add_admin_rights` / `/remove_admin_rights`, `/remove_faculty_rights`.
- `/reload_commands` and `/delete_command` — slash-command registration.
- `/fix_course_roles` — reconciles Discord course roles against the database in
  both directions. `/update_instructors`, `/update_invitelinks`, `/sort_courses`, `/update_categorynames`.
- `/update_database` + `/restore_server_from_database` — snapshot the server's
  courses, roles, and memberships to the database and rebuild them; used for
  recovery and migrations.
- `/list_courses`, `/server_status` (compares the server with the database) and `/delete_course`.
- `/add_scam_fingerprint`, `/list_scam_fingerprints`, `/remove_scam_fingerprint` — manage the known scam images.
  The message menu command Apps → **Add scam fingerprint** adds the images of an existing message.

### Membership sync

- A user's database record is created the first time they need one: joining a
  course, being made an instructor, faculty verification or admin rights. Joining
  the server alone creates nothing.
- On leave, the bot deletes the user record and their course-membership rows and
  refreshes the guide. On startup it also deletes records of anyone who left while
  it was offline.
- Identity fields (`name`, Discord ID) are encrypted at rest with AES-256-GCM,
  with an HMAC blind-index column for exact-match lookups. See
  [Field encryption](#field-encryption).

### Spam / scam protection (automated moderation)

- **Honeypot channel:** anyone posting in the "do not post here" channel
  is reported to staff, and posting the same content in both the honeypot and the
  public chat channel triggers an automatic kick (ban immediately followed by an
  unban, which also purges ~24 h of that account's recent messages).
- **Compromised-account image scams:** messages carrying two or more images are
  compared with known scam images by perceptual hash (a small preview of each
  image is downloaded and hashed in memory), and four-image messages are also
  checked against known image-dimension fingerprints. When every image matches,
  the message is deleted, the account is kicked, and the user is DM'd recovery
  instructions. Members with the `admin`, `cs-admin`, faculty or instructor role
  are never kicked for this; their message is still removed, they are DM'd a
  password-reset recommendation, and a report pings the admins. When only some images
  match, or four images match nothing, staff get a possible-scam report. That
  report is held for a minute and dropped if the honeypot kicks the account in
  that time.
- **Known scam images:** admins run `/add_scam_fingerprint` with a scam name and up
  to ten images, or right-click a message carrying the images (such as the bot's own
  scam report) and choose Apps → **Add scam fingerprint**, which asks for the scam
  name. The images of one command are stored under that scam name: each
  image is hashed, together with centre crops of it, and only the hashes are
  kept, in the `scam_image` table. `/list_scam_fingerprints` shows the known scams
  and `/remove_scam_fingerprint` removes one. Changes apply right away.

## Data storage

- PostgreSQL tables only for `User`, `Course`, `Channel`, `CourseMember`, and
  `ScamImage` (perceptual hashes of known scam images, with no user data).
- **No message content is persisted.** Chat text is used transiently for command
  parsing, spam detection (in memory, 1-hour TTL), and staff reports.

## Gateway intents

| Intent | Why |
| --- | --- |
| Guilds | Channel, role, and guild state. |
| **Guild Members** (privileged) | Leave events delete the user's data; the startup member list removes data of members who left while the bot was offline; `/fix_course_roles`, `/server_status`, `/update_database` and server restore compare every member's roles with the database. |
| **Message Content** (privileged) | Spam/scam detection only: image attachment fingerprints and perceptual hashes of attached images, and honeypot/`#chat` message comparison. The bot has no text or prefix commands. |
| Guild Messages | Spam firewall. |
| Guild Voice States | Voice-channel state used by course channels. |

The Guild Presences, Guild Webhooks and Guild Invites intents are **not** used.

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
- [CI/CD pipeline](./documentation/ci-cd-pipeline.md)

## Running locally

Node.js 24 or newer is required (the Docker image uses `node:24-alpine`).

Clone the repository and install dependencies:

```
npm install
```

Add a `.env` file to the repository root (same directory as `package.json`):

```
DISCORD_BOT_TOKEN=your-own-token
GUILD_ID=your-discord-server-id
BOT_ID=id-of-your-bot
CLIENT_SECRET=your-client-secret
DISCORD_REDIRECT_URL=your-client-oauth2-redirect-url-with-identify-guilds.join
DISCORD_SERVER_INVITE=your-discord-server-invite
PORT=your-custom-backend-port
SESSION_SECRET=server-session-secret
FIELD_ENCRYPTION_KEY=32-random-bytes-base64
BACKEND_SERVER_URL=backend-server-url-without-port
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
WORKSHOPS_API=pajat-api-url
SCAM_IMAGE_DEBUG=false
```

`SCAM_IMAGE_DEBUG=true` logs, for every message with two or more images, each image's perceptual hash, the closest
known scam image and the Hamming distance to it (matches are at most 8). Use it to see how close similar images get
before changing the threshold.

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
npm run dev:local   # development, against your own PostgreSQL
npm start           # staging
npm test            # run all tests
```

### Running with Docker

`docker-compose.yml` starts the bot together with its own PostgreSQL 17 (user, password and database `postgres`,
default `public` schema) on the `cs-discord-bot-net` network. The Docker image runs in the Europe/Helsinki time zone
(`TZ` in the `Dockerfile`). The bot reads the rest of its settings from `.env`; `DATABASE_URL` is overridden to point
at the database container, `SCAM_IMAGE_DEBUG` is set by the npm script, and Sentry is turned off
(`SENTRY_DISABLED=true`) so local testing doesn't report to the production Sentry project.

```
npm run dev         # docker compose up --build
npm run dev:debug   # the same, with SCAM_IMAGE_DEBUG=true
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
from Discord with `/update_database` + `/restore_server_from_database`
(course-membership history is lost). To roll the migration back (key still
present): `NODE_ENV=production node src/db/rollback.js`.

## License

[MIT](LICENSE)

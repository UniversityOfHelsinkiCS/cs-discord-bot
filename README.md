# CS DISCORD BOT

[![MIT license](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Course-management Discord bot for the University of Helsinki Department of
Computer Science server. Students self-serve into the right course channels;
faculty get tools to create and run those channels. Backed by PostgreSQL and a
small companion website used for faculty verification and course-join links.

## Documentation

- [User manual — student](./documentation/usermanual-student.md)
- [User manual — instructor](./documentation/usermanual-instructor.md)
- [User manual — faculty](./documentation/usermanual-faculty.md)
- [User manual — admin](./documentation/usermanual-admin.md)
- [Command reference](./documentation/commands.md)
- [Privacy policy](./PRIVACY_POLICY.md) · [Terms of service](./TERMS_OF_SERVICE.md)

## The server

The server is the shared Discord home for the Department of Computer Science at
the University of Helsinki. It hosts channels for courses where students ask for
help and talk with peers, volunteer instructors, and faculty; Discord activity is
voluntary and complements official teaching. Students pick up only the courses
they want with the `#guide` channel or with the `/join` command, keeping their channel list manageable. Faculty run
their own course spaces, and admins moderate guild-wide.

Invite: https://discord.gg/V5R9dZFCkD

## What our bot does

The full list of commands is in the [command reference](./documentation/commands.md).

### Course enrollment

Students join and leave courses with the **Join** and **Leave** buttons in the `#guide` channel, with `/join` and
`/leave`, or with a course link from Moodle or a MOOC page. Joining gives the course role, which shows the course's
channels. `/courses`, `/instructors`, `/workshops` and `/help` give course and command information.

### Faculty tools

Teachers get faculty rights with `/auth`, which checks their university staff account with single sign-on. They can
then create and run their own courses: add channels, lock the chat during exams, hide the course and name instructors.

### Admin tools

Admins manage admin and faculty rights, keep the server's courses and roles in sync with the database, restore the
server from the database, manage the known scam images, and kick users with a reason sent to them.

### Membership sync

- A user's database record is created the first time they need one: joining a
  course, being made an instructor, faculty verification or admin rights. Joining
  the server alone creates nothing.
- On leave, the bot deletes the user record and their course-membership rows and
  refreshes the guide. On startup it also deletes records of anyone who left while
  it was offline.
- Identity fields (`name`, Discord ID) are encrypted at rest. See
  [Field encryption](#field-encryption).

### Spam and scam protection

- **Honeypot channel:** posts in the "do not post here" channel are reported to staff. Posting the same content
  there and in the public chat, or posting in the honeypot twice within an hour, gets the account kicked.
- **Compromised-account image scams:** messages with two or more images are compared with known scam images by
  perceptual hash. When every image matches, the message is deleted, the account is kicked and the user gets
  password-reset instructions. Staff accounts are not kicked; their message is deleted and the admins are pinged.
  When only some images match, or four images match nothing, staff get a report to review.
- A kick is a ban that is lifted a minute later. It deletes the account's messages from the last 24 hours.

## Data storage

PostgreSQL tables:

| Table | Holds |
| --- | --- |
| `joined_users` | Users who joined a course or hold a staff role: encrypted name and Discord ID, and the faculty/admin flags. |
| `course` | Courses. |
| `channel` | Course channels. |
| `coursemember` | Which users are on which course, and who is an instructor. |
| `scam_image` | Perceptual hashes of known scam images. No user data. |
| `pending_unban` | Encrypted Discord ID and due time of an automatic kick's unban, deleted once the unban succeeds. |
| `Sessions` | Encrypted companion website login sessions. |

**No message content is stored.** The spam firewall keeps message text in memory for at most an hour, and
staff reports in Discord include the reported message.

## Gateway intents

| Intent | Why |
| --- | --- |
| Guilds | Channel, role, and guild state. |
| **Guild Members** (privileged) | Leave events delete the user's data; the startup member list removes data of members who left while the bot was offline; `/fix_course_roles`, `/server_status`, `/update_database` and server restore compare every member's roles with the database. |
| **Message Content** (privileged) | Spam/scam detection only: image attachment fingerprints and perceptual hashes of attached images, and honeypot/`#chat` message comparison. The bot has no text or prefix commands. |
| Guild Messages | Spam firewall. |
| Guild Voice States | Voice-channel state used by course channels. |

The Guild Presences, Guild Webhooks and Guild Invites intents are **not** used.

## Deployment and maintenance

- [Create and configure the bot](./documentation/setupbot.md)
- [CI/CD pipeline](./documentation/ci-cd-pipeline.md)
- [Privileged intent verification answers](./documentation/verification/privileged-intents.md)

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

| Variable | Value |
| --- | --- |
| `DISCORD_BOT_TOKEN` | Bot token from the Developer Portal's Bot tab. |
| `GUILD_ID` | ID of the Discord server the bot runs in. |
| `BOT_ID` | Application ID. Also the OAuth2 client ID of the companion website. |
| `CLIENT_SECRET` | OAuth2 client secret from the Developer Portal's OAuth2 tab. |
| `DISCORD_REDIRECT_URL` | `<website URL>/discordAuth`, e.g. `http://localhost:3000/discordAuth`. Add the same URL under Redirects on the OAuth2 tab. The website asks for the `identify` and `guilds.join` scopes. |
| `DISCORD_SERVER_INVITE` | Permanent invite link to the server. |
| `PORT` | Port of the companion website, e.g. `3000`. |
| `SESSION_SECRET` | Any random string. Signs the website's session cookies. |
| `FIELD_ENCRYPTION_KEY` | See [Field encryption](#field-encryption). |
| `BACKEND_SERVER_URL` | Website URL without the port, e.g. `http://localhost`. In production the port is not appended. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `WORKSHOPS_API` | URL of the workshop schedule API used by `/workshops`. |
| `SCAM_IMAGE_DEBUG` | `true` logs, for every message with two or more images, each image's perceptual hash, the closest known scam image and the Hamming distance to it (matches are at most 8). |

`config.json` in the repository root holds the role names and the repository URL:

| Key | Value |
| --- | --- |
| `courseAdminRole` | Suffix of each course's instructor role, e.g. `ohpe instructor` (`instructor`). |
| `facultyRole` | Name of the faculty role (`faculty`). |
| `githubRepo` | Repository URL, used for the user manual links in `/help` and the `#guide` channel topic. |

Install PostgreSQL ([download](https://www.postgresql.org/download/)) and create
the database referenced by `DATABASE_URL`. Migrations, including the identity
encryption migration, run automatically on startup.

Start the bot:

```
npm run dev:local   # development, against your own PostgreSQL
npm start           # production
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

`joined_users.name` / `discordId`, `pending_unban.discordId` and the website session store are encrypted at
rest at the application layer with AES-256-GCM, keyed by `FIELD_ENCRYPTION_KEY`
(32 bytes, base64). A `discordIdHash` column (HMAC-SHA256 of the Discord ID) is
the blind index used for exact-match lookups and uniqueness. Every ciphertext
carries a `v1:` key-version prefix.

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

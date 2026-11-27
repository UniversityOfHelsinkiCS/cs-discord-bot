# User manual for admins

Admins run the Department of Computer Science Discord server: they manage rights, keep the server in sync with the bot's database, and handle scams. Join the server with <https://study.cs.helsinki.fi/discord>.

## Admin commands

Admin commands are slash commands: type `/` in the message box and pick the command from the list. Their replies are visible only to you.

They are visible to members with the `admin` or `cs-admin` role, and run only for users with the admin flag in the database. A new admin or faculty command stays hidden until its roles are allowed in Discord's settings. See [Command visibility](./commands.md#command-visibility).

## Rights

- `/add_admin_rights` and `/remove_admin_rights` give and remove admin rights. Only admins can give admin rights.
- `/remove_faculty_rights` removes faculty rights. Faculty get them themselves with `/auth`.
- `/list_admins` lists the users with the admin flag.

If someone has the Discord role but not the database flag, `/update_database` copies the Discord roles into the database. It sets the flags from the current roles, so check the roles first.

## Courses

- `/delete_course` deletes a course after you confirm. The confirmation waits for one minute.
- `/sort_courses` sorts the course categories alphabetically.
- `/update_invitelinks` refreshes the pinned invite link and instructor list in every course announcement channel.

## Keeping Discord and the database in sync

- `/list_courses` lists the courses and channels in the database, with their Discord IDs.
- `/server_status` lists every mismatch between the server and the database: missing or misnamed categories, channels and roles, wrong permissions, and channels that are not in the database.
- `/fix_course_roles` reconciles course roles and memberships. See [its page](./commands/admin/fix_course_roles.md) for exactly what it changes.
- `/prune_users` deletes user records with no courses and no admin or faculty flag.
- `/update_database` saves the server's courses, channels, users and memberships into the database.
- `/restore_server_from_database` rebuilds the server's courses from the database when the server has been changed by hand. It asks for confirmation twice. See [its page](./commands/admin/restore_server_from_database.md) for what it changes, including which channels it deletes.

## Slash commands

- `/reload_commands` registers all slash commands with Discord again. It brings back deleted commands and adds new ones.
- `/delete_command` unregisters a command. Give the name without the `/`, e.g. `add_instructors`.

## Scams and kicks

The bot removes known scam images and kicks spam bots automatically, and reports possible scams in the commands channel. Admins maintain the list of known scam images:

- `/add_scam_fingerprint` adds up to ten images under a scam name.
- Apps → **Add scam fingerprint** on a message, such as the bot's own scam report, adds that message's images.
- `/list_scam_fingerprints` lists the known scams, and `/remove_scam_fingerprint` removes one.

Apps → **Kick user** on a message kicks its author with a reason sent to them, and can save the message's images as a scam first. To find Apps, right-click a message, or long-press it on mobile.

## More

- [Command reference](./commands.md#admin-commands), with a page for each command
- [Source code](https://github.com/UniversityOfHelsinkiCS/cs-discord-bot)

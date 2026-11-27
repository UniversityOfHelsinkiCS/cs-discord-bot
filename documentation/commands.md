# Command reference

All commands are slash commands: type `/` in the message box and pick the command from the list. The bot does not read commands sent as plain messages. Replies are visible only to you.

Each command links to its own page with its arguments and details.

## Commands for everyone

| Command | What it does |
| --- | --- |
| [/auth](./commands/general/auth.md) | Link to the faculty login page. |
| [/courses](./commands/general/courses.md) | Lists the public courses. |
| [/help](./commands/general/help.md) | Lists your commands, or shows how to use one. |
| [/instructors](./commands/general/instructors.md) | Lists the course's instructors. Used in a course channel. |
| [/join](./commands/general/join.md) | Joins a course. |
| [/leave](./commands/general/leave.md) | Leaves a course. |
| [/workshops](./commands/general/workshops.md) | Shows the course's workshop times. Used in a course channel. |

## Instructor commands

| Command | What it does |
| --- | --- |
| [/instructor_disconnect](./commands/instructor/instructor_disconnect.md) | Disconnects a user from your course's voice channel. |

## Faculty commands

| Command | What it does |
| --- | --- |
| [/add_instructors](./commands/faculty/add_instructors.md) | Gives users the course's instructor role. |
| [/create_channel](./commands/faculty/create_channel.md) | Adds a text channel to the course. |
| [/create_course](./commands/faculty/create_course.md) | Creates a course. |
| [/delete_channel](./commands/faculty/delete_channel.md) | Deletes an added channel. |
| [/edit_course](./commands/faculty/edit_course.md) | Changes the course code, full name or nickname. |
| [/edit_topic](./commands/faculty/edit_topic.md) | Sets the channel topic. |
| [/hide_channel](./commands/faculty/hide_channel.md) | Hides an added channel from students. |
| [/hide_course](./commands/faculty/hide_course.md) | Makes a course private. |
| [/lock_chat](./commands/faculty/lock_chat.md) | Lets only staff post in a course. |
| [/remove_instructors](./commands/faculty/remove_instructors.md) | Removes the instructor role from users. |
| [/rename_channel](./commands/faculty/rename_channel.md) | Renames an added channel. |
| [/status](./commands/faculty/status.md) | Shows the course's details. |
| [/unhide_channel](./commands/faculty/unhide_channel.md) | Shows a hidden channel to students again. |
| [/unhide_course](./commands/faculty/unhide_course.md) | Makes a course public. |
| [/unlock_chat](./commands/faculty/unlock_chat.md) | Lets students post in a course again. |

## Admin commands

| Command | What it does |
| --- | --- |
| [/add_admin_rights](./commands/admin/add_admin_rights.md) | Gives a user admin rights. |
| [/add_scam_fingerprint](./commands/admin/add_scam_fingerprint.md) | Adds a scam's images as known scam fingerprints. |
| [Apps → Add scam fingerprint](./commands/admin/add_scam_fingerprint_from_message.md) | Adds a message's images as known scam fingerprints. |
| [/delete_command](./commands/admin/delete_command.md) | Unregisters a slash command. |
| [/delete_course](./commands/admin/delete_course.md) | Deletes a course. |
| [/fix_course_roles](./commands/admin/fix_course_roles.md) | Reconciles course roles and memberships with the database. |
| [Apps → Kick user](./commands/admin/kick_user_from_message.md) | Kicks a message's author, with a reason sent to them. |
| [/list_admins](./commands/admin/list_admins.md) | Lists users with the admin flag. |
| [/list_courses](./commands/admin/list_courses.md) | Lists the courses and channels in the database. |
| [/list_scam_fingerprints](./commands/admin/list_scam_fingerprints.md) | Lists the known scams. |
| [/prune_users](./commands/admin/prune_users.md) | Deletes user records with no courses and no rights. |
| [/reload_commands](./commands/admin/reload_commands.md) | Registers all slash commands again. |
| [/remove_admin_rights](./commands/admin/remove_admin_rights.md) | Removes a user's admin rights. |
| [/remove_faculty_rights](./commands/admin/remove_faculty_rights.md) | Removes a user's faculty rights. |
| [/remove_scam_fingerprint](./commands/admin/remove_scam_fingerprint.md) | Removes a known scam. |
| [/restore_server_from_database](./commands/admin/restore_server_from_database.md) | Rebuilds the server's courses from the database. |
| [/server_status](./commands/admin/server_status.md) | Lists mismatches between the server and the database. |
| [/sort_courses](./commands/admin/sort_courses.md) | Sorts the course categories alphabetically. |
| [/update_database](./commands/admin/update_database.md) | Saves the server's courses, users and memberships to the database. |
| [/update_invitelinks](./commands/admin/update_invitelinks.md) | Refreshes the pinned message in each announcement channel. |

## Autocomplete

Some arguments offer a list as you type. The list narrows down as you type any part of the name. Courses are shown as `Full name - nickname - CODE`, in alphabetical order by full name. Discord shows at most 25 entries, so type a few letters to find the rest.

| Command | The argument offers |
| --- | --- |
| `/help` | The commands you can use |
| `/join` | Public courses |
| `/leave` | The courses you are on |
| `/delete_channel` | Channels added to the course the command is used in |
| `/hide_course` | Public courses |
| `/unhide_course` | Private courses |
| `/lock_chat` | Courses that are not locked |
| `/unlock_chat` | Locked courses |
| `/delete_command` | Commands registered in Discord |
| `/delete_course` | All courses |
| `/remove_scam_fingerprint` | Known scams |

## Course cooldown

`/edit_course`, `/edit_topic`, `/hide_course`, `/unhide_course`, `/lock_chat` and `/unlock_chat` share a 5-minute cooldown per course. After one of them changes a course, none of them can be used on that course for 5 minutes. `/rename_channel` has its own 5-minute cooldown per channel.

## Command visibility

Admin and faculty commands are registered as restricted, so by default Discord shows them only to members with the Administrator permission. A server admin allows the right roles once for each new command in **Server Settings → Integrations → [bot name] → Commands**:

- **Admin commands:** `admin` and `cs-admin`
- **Faculty commands:** `faculty`, `admin` and `cs-admin`

The bot can't do this itself, and `/reload_commands` or a restart doesn't do it either.

Seeing a command doesn't mean you can run it. When a command runs, the bot checks the database: admin commands need the `admin` flag, and faculty commands need the `faculty` or `admin` flag.

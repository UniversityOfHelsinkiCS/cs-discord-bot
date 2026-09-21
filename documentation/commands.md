### cs-discord-bot

### Autocomplete

Some arguments offer a list as you type. The list narrows down as you type any part of the name, and courses are shown as `Full name - nickname - CODE` in alphabetical order by full name. Discord shows at most 25 entries, so type a few letters to find the rest.

Command | The argument offers
--- | ---
`/join`, `/hide_course` | Public courses
`/leave` | The courses you have joined
`/unhide_course` | Private courses
`/lock_chat` | Courses that are not locked
`/unlock_chat` | Locked courses
`/delete_course` | All courses
`/delete_channel` | Channels added to the course the command is used in
`/delete_command` | Commands registered in Discord
`/help` | The commands you can use

### Admin commands

Admin and faculty commands are restricted by default: Discord shows them only to members with the Administrator permission. **A server admin must allow the right roles once per command**, otherwise nobody else sees them. Open **Server Settings → Integrations → [bot name] → Commands**, select the command and add the roles below. The bot cannot do this itself.

- **Admin commands:** allow the `admin` and `cs-admin` roles.
- **Faculty commands:** allow the `faculty`, `admin` and `cs-admin` roles.

This is only needed for newly added commands; `/reload_commands` and restarting the bot do not grant it. Seeing a command is not enough to use it, because the bot also checks the database when the command is run: admin commands need the `admin` flag, faculty commands need the `faculty` or `admin` flag. The exceptions are `/add_admin_rights`, `/remove_admin_rights` and `/list_admins`, which need Discord's Administrator permission instead of the database flag.

Command | Description | Example
--- |--- | ---
`/add_admin_rights` | Add admin rights to given user. | `/add_admin_rights user:@someone`
`/delete_command` | Delete the given slash command. | `/delete_command command_name:help`
`/delete_course` | Delete the given course channel. | `/delete_course course_name:ohpe`
`/fix_course_roles` | Add missing course roles and sync course memberships from Discord to the database. | `/fix_course_roles`
`/list_admins` | List all users with the admin flag in the database. | `/list_admins`
`/list_courses` | List all courses and channels. | `/list_courses`
`/reload_commands` | Reload all slash commands, returning deleted commands and registering new commands. | `/reload_commands`
`/remove_admin_rights` | Remove admin rights from given user. | `/remove_admin_rights user:@someone`
`/remove_faculty_rights` | Remove faculty rights from given user. | `/remove_faculty_rights user:@someone`
`/restore_server_from_database` | Recreate the Discord server from the database. | `/restore_server_from_database`
`/server_status` | Check if the Discord server and database are in sync. | `/server_status`
`/sort_courses` | Sort courses alphabetically. | `/sort_courses`
`/update_categorynames` | Update category names to the new format. | `/update_categorynames`
`/update_database` | Save existing channels to database. | `/update_database`
`/update_instructors` | Update course instructor roles. | `/update_instructors`
`/update_invitelinks` | Update course invitation links. | `/update_invitelinks`

### Faculty commands

Faculty commands are hidden until a server admin has allowed the `faculty`, `admin` and `cs-admin` roles for them in Discord's Integrations settings (see the note under Admin commands above). Running a command also requires the `faculty` or `admin` flag in the bot's database, which `/auth` sets.

Command | Description | Example
--- |--- | ---
`/add_instructors` | Give instructor role to (multiple) users. | `/add_instructors @user1 @user2`
`/create_channel` | Add a text channel for the course. Must be used inside a course. | `/create_channel questions`
`/create_course ` | Create a given course channel | `/create_course ohpe ohjelmoinnin perusteet`
`/create_poll ` | Create a poll | `/create_poll Question 10 answer1 | answer 2 | answer 3`
`/delete_channel` | Delete a text channel from the course. Must be used inside a course. | `/delete_channel questions`
`/edit_course` | Edit course information, e.g. course code, fullname, or nickname. Must be used inside a course. | `/edit_course nickname ohpe`
`/edit_topic` | Edit channel topic, replacing an already existing topic. | `/edit_topic perusteet`
`/hide_channel` | Make the channel hidden from regular users. Must be used inside a course and in a non-default text channel. | `/hide_channel`
`/hide_course` | Make the given course private, disabling joining with `/join` | `/hide_course ohpe`
`/lock_chat` | Lock the given course, disabling messaging by regular users | `/lock_chat ohpe`
`/rename_channel` | Rename a Discord text channel. Must be used inside a course and in a non-default text channel. | `/rename_channel questions`
`/status` | Get full status of course. Must be used inside a course. | `/status`
`/unhide_channel` | Make the channel visible to regular users. Must be used inside a course and in a non-default text channel. | `/unhide_channel`
`/unhide_course` | Make the given course public, enabling joining with `/join`. | `/unhide_course ohpe`
`/unlock_chat` | Unlock the given course, enabling messaging by regular users. | `/unlock_chat ohpe`

### Commands for everyone

Command | Description | Example
--- |--- | ---
`/auth` | Gives you a link which you can use to authenticate as a faculty member. | `/auth`
`/courses` | Prints out all the available courses. | `/courses`
`/help` |  Lists available commands for your role. | `help`
`/help "command name"` | Shows information on the given command. | `/help courses`
`/intructors` | Lists the instructors of the course. Must be used inside a course. | `/instructors`
`/join` | Join the given course. After writing `/join`, the bot will give you a list of public courses to choose from. | `/join`
`/leave` | Leave the given course. After writing `/leave`, the bot will give you a list of the courses you have joined to choose from. | `/leave`
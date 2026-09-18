### cs-discord-bot

### Admin commands

Admin commands are registered with `.setDefaultPermission(false)`, but Discord's Integrations page does not reliably reflect that as a "hidden by default" state (this repo is on the old, deprecated command-permissions v1 field; Discord's current permissions v2 system may not honor it). After adding or redeploying an admin command, a server admin must go to **Server Settings → Integrations → [bot name]** and, for that command, explicitly add `@everyone` and set it to **disabled**, then add the `admin` and `cs-admin` roles and set them to **enabled**. Don't rely on the command being hidden without the explicit `@everyone` deny — otherwise the command won't be reliably restricted. This is a one-time step per command; running `/reload_commands` does not re-apply it automatically. Execution is additionally gated in code by the invoking user's `admin` flag in the database.

Command | Description | Example
--- |--- | ---
`/add_admin_rights` | Add admin rights to given user. | `/add_admin_rights user:@someone`
`/delete_command` | Delete the given slash command. | `/delete_command command_name:help`
`/delete_course` | Delete the given course channel. | `/delete_course course_name:ohpe`
`/fix_course_roles` | Add missing course roles and sync course memberships from Discord to the database. | `/fix_course_roles`
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
`/join` | Join the given course. After writing `/join`, the bot will give you a list of courses to choose from. | `/join`
`/leave` | Leave the given course. After writing `/leave`, the bot will give you a list of courses to choose from. | `/leave`
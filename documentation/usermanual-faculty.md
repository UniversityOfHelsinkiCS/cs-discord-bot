# User manual for faculty

This guide is for course lecturers who want a Discord chat for their course. It goes through the steps in order: why to use it, getting onto Discord, getting faculty rights, creating your course, and then running it.

## 1. Why use the CS Discord for your course

The Department of Computer Science has a dedicated Discord server for course support. Each course gets its own space on the server, and students only see the courses they have joined.

- **Ready-made course space.** One command creates a course with an announcement channel that only staff can post in, a general chat, and a voice channel. You can add more channels, including channels that only staff can see.
- **Students join with one click.** Put the course link on your Moodle or MOOC page. Students who click it are added to the server and your course in one step. They can also join from the `#guide` channel or with the `/join` command.
- **Moderated platform.** The server has rules and admins. The bot automatically removes known scam messages from hacked accounts and kicks spam bots.
- **Chat controls.** You can lock the course chat, for example during an exam, and disconnect people from voice channels.
- **Help from instructors and peers.** You can give course assistants the instructor role, so students can see who to ask with `/instructors`. Students also help each other.
- **No Discord setup needed.** The bot handles roles and permissions. You never have to touch Discord's server settings.

## 2. Getting onto Discord

### About Discord

To learn more about Discord in general, see their [official website](https://discord.com/) and the [Beginner's Guide to Discord](https://support.discord.com/hc/en-us/articles/360045138571-Beginner-s-Guide-to-Discord).

We recommend the Discord app ([desktop or mobile](https://discord.com/download)). If you can't or don't want to install it, you can use Discord in your browser instead.

### Create your Discord account

Create an account on the [Discord website](https://discord.com/). If you already have one, [log in](https://discord.com/login) with your email address or phone number.

### Join the server

Join the server with this link: <https://study.cs.helsinki.fi/discord>.

## 3. Get faculty rights with `/auth`

Faculty rights let you create and manage courses. You only need to do this once.

1. In any channel on the server, type `/auth` and pick it from the list that opens. The bot replies with a link that only you can see.
2. Open the link and log in with your **University of Helsinki account**. Only university staff accounts are accepted.
3. Discord asks you to allow the login. Accept it.
4. You are sent back to Discord with the **faculty** role.

What this does:
- You get the faculty role, and the bot marks you as faculty in its database. The bot checks this mark every time you use a faculty command.
- Faculty commands, such as `/create_course`, appear in your command list.

**If faculty commands don't show up after `/auth`, ask an admin.** A server admin has to allow the faculty role for new commands in Discord's settings, and until then they stay hidden.

### Using the bot's commands

All commands are used by typing `/` followed by the command name in the message box, then picking the command from the list that opens. **Pasting a command as a normal message does not work. Type it and pick it from the list.** Use `/help` to see every command you can use.

## 4. Create your course

Use `/create_course` with these options:

- **coursecode**: the course code, e.g. TKT10001.
- **full_name**: the full name of the course, e.g. Web-palvelinohjelmointi. It must be unique.
- **nick_name** (optional): a short name, e.g. wepa. If you leave it out, the course code is used.

The nickname is what students see in the channel list on the left, so we recommend a short one. It must be unique. If your course is an open university course, add **MOOC** to the full name.

The bot then:
- Creates a course category, shown as `📚 wepa` in the channel list, with three channels:
  - `wepa_announcement`: only you and the course instructors can post here.
  - `wepa_general`: the course chat.
  - `wepa_voice`: a voice channel.
- Makes you an instructor of the course.
- Adds the course to the list in `#guide`, where students can join it with the **Join** button.
- Pins the **course invitation link** in `wepa_announcement`. The link looks like `https://study.cs.helsinki.fi/discord/join/wepa`.

### Share the course link

Put the invitation link on your course page in Moodle, MOOC or wherever your students look. When a student clicks it, they are added to the server and to your course at once, even if they were not on the server before. Here is an example from a course page:

![Course page with the Discord link](./images/courselink.png)

## 5. Running your course

Most of these commands are used inside one of your course's channels.

### Add or remove instructors

Instructors are, for example, course assistants who help students. Use `/add_instructors @user1 @user2` in a course channel to give people the instructor role. Students can see the instructors with `/instructors`, and they are also listed in the pinned message in the announcement channel.

To remove the role, use `/remove_instructors @user1 @user2`. Instructors can't leave the course themselves while they have the instructor role.

### More channels

Use `/create_channel feedback` inside your course to add a text channel. The name you give is added to the course name, so in the wepa course this creates `wepa_feedback`.

- `/rename_channel critique`, used inside `wepa_feedback`, renames it to `wepa_critique`.
- `/delete_channel feedback`, used inside the course, deletes `wepa_feedback`.
- `/hide_channel`, used inside the channel, hides it from students, e.g. for a private chat for course staff. `/unhide_channel` shows it again.

Only channels you added yourself can be renamed, deleted or hidden. The default announcement, general and voice channels can't.

### Channel topics

Use `/edit_topic` inside a channel to set the text shown at the top of the channel.

### Hide the course

`/hide_course wepa` hides the course from the `#guide` list, `/courses` and `/join`. Students can then only join with the course link. Hidden courses are shown with 👻 in the channel list. `/unhide_course wepa` makes it public again.

### Lock the chat

`/lock_chat wepa` stops students from posting in the course channels, so only faculty and admins can write. Course instructors who are not faculty can't post either while the chat is locked. This is useful during an exam. Locked courses are shown with 🔐. `/unlock_chat wepa` opens the chat again.

### Edit the course

Use `/edit_course` inside the course to change the course code, full name or nickname. If you change the name shown in the channel list, you have to wait 15 minutes before you can change it again.

### Polls

`/create_poll` creates a poll in the channel you use it in. Give it a **title**, a **duration** in minutes (at most 14), and the **answers** separated by ` | `, for example `Java | Python`. You can also add a **description**. The poll closes by itself after the duration, or when you click its **Close Poll** button, and then shows the results.

### Course status

`/status` inside a course shows its information, such as the number of members and the instructors.

### Disconnect someone from voice

`/instructor_disconnect @user` disconnects a user from the voice channel they are in.

## Command reference

#### Faculty commands

Command | Explanation | Arguments
--------|-------------|----------:
[/add_instructors](./commands/faculty/add_instructors.md) | Give instructor role to (multiple) users, e.g., /add_instructors @user1 @user2. | Required
[/create_channel](./commands/faculty/create_channel.md) | Create new text channel inside a course, e.g., /create_channel feedback. | Required
[/create_course](./commands/faculty/create_course.md) | Create a new course | Required
[/create_poll](./commands/faculty/create_poll.md) | Create a new poll | Required
[/delete_channel](./commands/faculty/delete_channel.md) | Remove given text channel inside a course, e.g., /delete_channel feedback. | Required
[/edit_course](./commands/faculty/edit_course.md) | Edit course information, options; coursecode, full name, nickname | Required
[/edit_topic](./commands/faculty/edit_topic.md) | Edit topic, must be used in a course channel, e.g., /edit_topic A new topic. | Required
[/hide_channel](./commands/faculty/hide_channel.md)| Make the channel hidden from regular users, e.g., /hide_channel. | None
[/hide_course](./commands/faculty/hide_course.md)| Make given course private, e.g., /hide_course wepa. | Required
[/lock_chat](./commands/faculty/lock_chat.md) | Lock the chat (meaning only faculty and admins can post messages) of a given course | Required
[/remove_instructors](./commands/faculty/remove_instructors.md) | Remove instructor role from (multiple) users, e.g., /remove_instructors @user1 @user2. | Required
[/rename_channel](./commands/faculty/rename_channel.md) | Rename the non-default course text channel the command is used in, e.g., /rename_channel feedback. | Required
[/status](./commands/faculty/status.md) | Used in course channel returns general info about the course | None
[/unhide_channel](./commands/faculty/unhide_channel.md)| Make the channel visible to regular users, e.g., /unhide_channel. | None
[/unhide_course](./commands/faculty/unhide_course.md) | Make given course public, e.g., /unhide_course wepa. | Required
[/unlock_chat](./commands/faculty/unlock_chat.md) | Unlock the chat of a given course | Required

#### Instructor commands

Command | Explanation | Arguments
--------|-------------|----------:
[/instructor_disconnect](./commands/instructor/instructor_disconnect.md) | Disconnect another user from a voice chat, e.g., /instructor_disconnect @user1. | Required

#### General commands

Command | Explanation | Arguments
--------|-------------|----------:
[/auth](./commands/general/auth.md) | Returns the URL from which the faculty role can be obtained. | None
[/courses](./commands/general/courses.md) | Returns a list of all courses. | None
[/help](./commands/general/help.md) | Returns a list of commands with info or info about a specific command. | Optional
[/instructors](./commands/general/instructors.md) | Used in a course channel, returns a list of the course instructors. | None
[/join](./commands/general/join.md) | Joins you into the course given, e.g., /join ohpe. | Required
[/leave](./commands/general/leave.md) | Remove you from the course given, e.g., /leave ohpe. | Required
[/workshops](./commands/general/workshops.md) | Get workshop info for the course. | None

## Material

[Source code for the bot](https://github.com/UniversityOfHelsinkiCS/cs-discord-bot)

# User manual for instructors

Instructors are course assistants who help students on the Department of Computer Science Discord server. A course's faculty member gives you the instructor role with `/add_instructors`. Students then see you in `/instructors` and in the pinned message in the course's announcement channel.

## Join the server

Join with <https://study.cs.helsinki.fi/discord>, or with the course's own link on its Moodle or MOOC page.

![Course link](./images/courselink.png)

## Use the bot

The bot is used with slash commands. Type `/` in the message box and pick a command from the list that opens. Commands sent as plain messages don't work. `/help` lists the commands you can use.

As an instructor you can:

- post in the course's announcement channel
- post in the course while its chat is locked
- disconnect users from the course's voice channel

You can't leave a course while you are its instructor. Ask a faculty member to remove the role with `/remove_instructors` first.

## Disconnect a user from voice

`/instructor_disconnect @user` disconnects a user from the voice channel they are in, after you confirm. It works only for the voice channel of a course you instruct. For example, if you instruct tito, you can disconnect a user from `tito_voice` but not from `wepa_voice`.

## More

- [Command reference](./commands.md)
- [Source code](https://github.com/UniversityOfHelsinkiCS/cs-discord-bot)

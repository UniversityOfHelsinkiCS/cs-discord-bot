# User manual for instructors

Instructors are course assistants who help students on the Department of Computer Science Discord server. A course's faculty member gives you the instructor role with `/add_instructors`. Students then see you in `/instructors` and in the pinned message in the course's announcement channel.

## About Discord

To learn more about Discord in general, see their [official website](https://discord.com/) and the [Beginner's Guide to Discord](https://support.discord.com/hc/en-us/articles/360045138571-Beginner-s-Guide-to-Discord).

We recommend the Discord app ([desktop or mobile](https://discord.com/download)). If you can't or don't want to install it, you can use Discord in your browser instead.

## Create your Discord account

Create an account on the [Discord website](https://discord.com/). If you already have one, [log in](https://discord.com/login) with your email address or phone number.

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

# User manual for students

The Department of Computer Science has a Discord server for course support. Each course has its own channels, where students ask for help and help each other, together with volunteer instructors and faculty. Taking part is voluntary.

Please help others, but don't share answers to exercises. Small hints still let others learn by themselves.

## Join the server and your courses

Your course page in Moodle or MOOC has a link to the course's Discord channels. Clicking it adds you to the server and to that course.

![Moodle link](./images/moodlelink.png)

You can also join the server with <https://study.cs.helsinki.fi/discord>. Discord opens in the `#guide` channel, which lists the courses you can join. Click a course's blue **Join** button to join it, or its red **Leave** button to leave. The bot's reply is visible only to you.

![Welcome](./images/welcome.png)

We recommend the Discord [desktop or mobile app](https://discord.com/download), but Discord also works in a browser.

## Use the bot

The bot is used with slash commands. Type `/` in the message box and pick a command from the list that opens. Commands sent as plain messages don't work.

![commands](./images/commands.png)

The list narrows down as you type. For example, `/i` shows the commands that start with `i`. `TAB` fills in the top one.

![commandMatch](./images/commandMatch.png)

`/help` lists the commands you can use, and `/help` with a command name shows how to use that command.

![help](./images/help.png)

`/courses` lists the public courses.

![courses](./images/courses.png)

`/join` adds you to a course. Pick the course from the list, which shows each course as `Full name - nickname - CODE`. Type any part of the name, nickname or code to narrow it down.

![join](./images/join.png)

`/leave` removes you from a course. The list shows the courses you are on.

## Course channels

After joining a course, its channels appear in the channel list on the left.

![channels](./images/channels.png)

- **announcement:** news from the course staff.
- **general:** the main course chat.
- **voice:** a voice channel for talking with other students and instructors.
- Some courses have more channels, for example for a part of the course.

In a course channel, `/instructors` lists the course's instructors. They are also listed in the pinned message in the announcement channel.

![instructors](./images/instructors.png)

`/workshops` in a course channel shows when and where instructors are available during the next week.

![workshops](./images/workshops.png)

## More

- [Command reference](./commands.md#commands-for-everyone)
- [Source code](https://github.com/UniversityOfHelsinkiCS/cs-discord-bot)

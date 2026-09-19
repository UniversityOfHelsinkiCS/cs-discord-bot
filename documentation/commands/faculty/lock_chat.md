## /lock_chat

- :heavy_check_mark: Can be used in every channel.
- :heavy_check_mark: Reply with an ephemeral message - is only visible to the user of the interaction.
- :heavy_check_mark: Response includes the interaction status.
- :heavy_check_mark: Needs argument: course_name.
- :heavy_check_mark: The argument autocompletes with the courses that are not locked and narrows down as you type.
- :heavy_check_mark: This command has cooldown (course specific).
- :x: Only visible to members with the `faculty`/`admin`/`cs-admin` role, and only usable by users with the faculty or admin flag set in the database.

Note: Regular users can't send messages in a locked channel.
## /create_course

- :heavy_check_mark: Can be used in every channel.
- :heavy_check_mark: Reply with an ephemeral message - is only visible to the user of the interaction.
- :heavy_check_mark: Response includes the interaction status.
- :heavy_check_mark: Needs arguments.
- :x: Only visible to members with the `faculty`/`admin`/`cs-admin` role, and only usable by users with the faculty or admin flag set in the database.

Argument | Optional | Info
---------|----------|------ 
Code | :x: | 
Fullname | :x: |
nick | :heavy_check_mark: | If no nickname is given, the code is used as the nickname.
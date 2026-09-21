## /add_instructors

- :heavy_check_mark: Can be used only in course channels.
- :heavy_check_mark: Reply with an ephemeral message - is only visible to the user of the interaction.
- :heavy_check_mark: Needs argument: users to give the intructor role.
- :x: Only visible to members with the `faculty`/`admin`/`cs-admin` role, and only usable by users with the faculty or admin flag set in the database.
- :x: Can give the intructor role to a member who is not on the course.
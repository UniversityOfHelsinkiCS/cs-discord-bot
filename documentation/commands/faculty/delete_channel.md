## /delete_channel

- :heavy_check_mark: Can be used only in course channels. Channel to remove and where command is used must have same parent (same course).
- :heavy_check_mark: Reply with an ephemeral message - is only visible to the user of the interaction.
- :heavy_check_mark: Response includes the interaction status.
- :heavy_check_mark: Needs argument: channel name.
- :heavy_check_mark: The argument autocompletes with the channels that have been added to the course the command is used in.
- :x: Can remove any course channel: default channels cannot be removed with this command.
- :x: Only visible to members with the `faculty`/`admin`/`cs-admin` role, and only usable by users with the faculty or admin flag set in the database.

## /prune_users

- :heavy_check_mark: Slash command, replies ephemerally (only visible to the invoker).
- :x: Needs arguments.
- :x: Only visible to members with the `admin`/`cs-admin` role, and only usable by users with the admin flag set in the database.
- Deletes every user record that has no course memberships and neither the admin nor the faculty flag, after asking for confirmation. The reply shows how many records will be deleted.
- These records are left over from when the bot stored every member who joined the server. Discord roles are not changed.

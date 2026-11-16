## /remove_scam_fingerprint

- :heavy_check_mark: Slash command, replies ephemerally (only visible to the invoker).
- :heavy_check_mark: Needs arguments: `scam_name`, picked from the list of known scams.
- :x: Only visible to members with the `admin`/`cs-admin` role, and only usable by users with the admin flag set in the database.
- Removes the scam and the fingerprints of all of its images, after asking for confirmation. The bot stops matching those images right away.

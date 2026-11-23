## Apps → Kick user

- :heavy_check_mark: Message menu command: right-click a message (or long-press it on mobile) and choose Apps → **Kick user**. A form asks for the reason, and the reply is ephemeral (only visible to the invoker).
- :x: Only visible to members with the `admin`/`cs-admin` role, and only usable by users with the admin flag set in the database.
- Kicks the author of that message: the bot bans them, which deletes their messages from the last 24 hours, and lifts the ban about a minute later so they can rejoin.
- Reasons to choose from: **Scam images**, **Scam message**, **Inappropriate behavior** and **Other**. **Details** is required for Other and optional for the rest; it is added to the reason.
- The member is sent a direct message before the kick. For the scam reasons it says their account has most likely been compromised and asks them to reset their password. For the other reasons it gives the reason.
- When the message has images, the form also asks whether to add them to scam fingerprints, together with a scam name. This works like [Apps → Add scam fingerprint](./add_scam_fingerprint_from_message.md) and is only allowed for the scam reasons. The images are saved before the kick, because the kick deletes the message. If they cannot be saved, for example because the scam name is taken, the member is not kicked and you can try again.
- A report is posted in the commands channel naming the member, the reason and the admin. If the ban does not go through, the report and the reply say so.
- Bots and yourself cannot be kicked with this command.

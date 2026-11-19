## Apps → Add scam fingerprint

- :heavy_check_mark: Message menu command: right-click a message (or long-press it on mobile) and choose Apps → **Add scam fingerprint**. A form asks for the scam name, and the reply is ephemeral (only visible to the invoker).
- :x: Only visible to members with the `admin`/`cs-admin` role, and only usable by users with the admin flag set in the database.
- Adds the image attachments of that message as one known scam, like [/add_scam_fingerprint](./add_scam_fingerprint.md) does with uploaded images. Other attachments, and images that are only links or embeds, are ignored.
- Works on the bot's own scam reports in the commands channel, which keep the images after the original message has been deleted.
- The name must not already be in use. Images that are already known, have too little detail to recognise, or cannot be downloaded are skipped, and the reply lists them.
- A note is posted in the commands channel naming the scam, its images, the source message and the admin who added it.

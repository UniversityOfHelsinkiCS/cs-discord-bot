# Apps → Add scam fingerprint

Adds the image attachments of a message as one known scam, like [/add_scam_fingerprint](./add_scam_fingerprint.md) does with uploaded images.

- **Who:** Admins
- **Where:** Right-click a message (long-press on mobile) and choose Apps → **Add scam fingerprint**
- **Confirmation:** No. A form asks for the scam name, which must not already be in use.

- Other attachments, and images that are only links or embeds, are ignored.
- Works on the bot's own scam reports in the commands channel, which keep the images after the original message is deleted.
- Images that are already known, have too little detail to recognise, or can't be downloaded are skipped, and the reply lists them.
- A note naming the scam, its images, the source message and the admin is posted in the commands channel.

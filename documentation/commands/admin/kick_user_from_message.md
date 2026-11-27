# Apps → Kick user

Kicks the author of a message and sends them the reason.

- **Who:** Admins
- **Where:** Right-click a message (long-press on mobile) and choose Apps → **Kick user**
- **Confirmation:** No. A form asks for the reason.

| Form field | Required | Description |
| --- | --- | --- |
| Reason | Yes | **Scam images**, **Scam message**, **Inappropriate behavior** or **Other**. |
| Details | For Other | Added to the reason. |
| Add images to scam fingerprints | No | Only for the scam reasons, and only when the message has images. |
| Scam name | When adding images | Name for the new scam fingerprint. |

- The bot bans the author, which deletes their messages from the last 24 hours, and lifts the ban about a minute later so they can rejoin.
- The author gets a direct message before the kick. For the scam reasons it says their account has most likely been compromised and asks them to reset their password. For the other reasons it gives the reason.
- Images are saved as fingerprints before the kick, because the kick deletes the message. This works like [Apps → Add scam fingerprint](./add_scam_fingerprint_from_message.md). If they can't be saved, for example because the scam name is taken, the author is not kicked.
- A report naming the member, the reason and the admin is posted in the commands channel. If the ban fails, the report and the reply say so.
- Bots and yourself can't be kicked with this command.

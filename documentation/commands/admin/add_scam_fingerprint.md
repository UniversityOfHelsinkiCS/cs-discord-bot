# /add_scam_fingerprint

Adds a scam's images as known scam fingerprints. All images given in one command are saved under one scam name.

- **Who:** Admins
- **Where:** Any channel
- **Confirmation:** No

| Argument | Required | Description |
| --- | --- | --- |
| `scam_name` | Yes | A name for the scam. Must not already be in use. |
| `image1` | Yes | A scam image. |
| `image2` … `image10` | No | More images of the same scam. |

- Only perceptual hashes of the images are stored, never the images. Each image is also hashed with its edges cropped, so lightly cropped copies are still recognised.
- Images that are already known, have too little detail to recognise (such as a plain background), or can't be downloaded are skipped, and the reply lists them.
- The bot uses new fingerprints right away. A message whose images all match is removed and its sender kicked; a message where only some match is reported to staff. Members with a staff role are not kicked: their message is removed, they are sent a password-reset recommendation, and the admins are pinged.
- A note naming the scam, its images and the admin is posted in the commands channel.
- See the known scams with [/list_scam_fingerprints](./list_scam_fingerprints.md) and remove one with [/remove_scam_fingerprint](./remove_scam_fingerprint.md).

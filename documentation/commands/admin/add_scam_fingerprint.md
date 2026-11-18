## /add_scam_fingerprint

- :heavy_check_mark: Slash command, replies ephemerally (only visible to the invoker).
- :heavy_check_mark: Needs arguments: `scam_name`, a name for the scam, and `image1` to `image10`, the scam's images. Only `image1` is required.
- :x: Only visible to members with the `admin`/`cs-admin` role, and only usable by users with the admin flag set in the database.
- All images given in one command are saved under the given scam name. The name must not already be in use.
- Only perceptual hashes of the images are stored, never the images themselves. Each image is also hashed with its edges cropped, so lightly cropped copies are still recognised.
- Images that are already known, have too little detail to recognise (such as a plain background), or cannot be downloaded are skipped, and the reply lists them.
- The bot uses new fingerprints right away. A message whose images all match known scam images is removed and its sender kicked; a message where only some images match is reported to staff. Members with a staff role are never kicked for this: their message is removed, they are sent a message recommending a password reset, and the admins are pinged.
- A note is posted in the commands channel naming the scam, its images and the admin who added it.
- See the known scams with [/list_scam_fingerprints](./list_scam_fingerprints.md) and remove one with [/remove_scam_fingerprint](./remove_scam_fingerprint.md).

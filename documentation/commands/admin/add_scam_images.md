## /add_scam_images

- :heavy_check_mark: Slash command, replies ephemerally (only visible to the invoker).
- :heavy_check_mark: Needs arguments: `chain`, a name for the scam, and `image1` to `image10`, the scam's images. Only `image1` is required.
- :x: Only visible to members with the `admin`/`cs-admin` role, and only usable by users with the admin flag set in the database.
- All images given in one command are saved as one scam chain under the given name. The name must not already be in use.
- Only perceptual hashes of the images are stored, never the images themselves. Each image is also hashed with its edges cropped, so lightly cropped copies are still recognised.
- Images that are already known, have too little detail to recognise (such as a plain background), or cannot be downloaded are skipped, and the reply lists them.
- The bot uses a new chain right away. A message whose images all match known scam images is removed and its sender kicked; a message where only some images match is reported to staff. Members with a staff role are never kicked for this.

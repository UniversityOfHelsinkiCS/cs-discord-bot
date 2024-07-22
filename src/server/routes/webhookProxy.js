require("dotenv").config();
const axios = require("axios");
const router = require("express").Router();

router.post("/:webhookId", async (req, res) => {
  const webhookUrl = `${process.env.DISCORD_WEBHOOK_URL}/${req.params.webhookId}/${process.env.DISCORD_WEBHOOK_TOKEN}`;
  const webhookData = req.body;
  try {
    await axios.post(webhookUrl, webhookData, {
      params: req.query,
      headers: {
        "Content-Type": req.headers["Content-Type"],
      },
    });
    res.status(200).send("Webhook sent successfully");
    return;
  }
  catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
    return;
  }
});

module.exports = router;

require("dotenv").config()
const axios = require("axios")
const router = require("express").Router()

router.get("/:webhookId", async (req, res) => {
  // only allow POST
  if (req.method === "POST") {
    const webhookUrl = `${process.env.DISCORD_WEBHOOK_URL}/${req.params.webhookId}/${process.env.DISCORD_WEBHOOK_TOKEN}`
    const webhookData = req.body
    try {
      await axios.post(webhookUrl, webhookData)
      res.status(200).send("Webhook sent successfully")
    } catch (error) {
      console.error(error)
      res.status(500).send("Internal server error")
    }
  } else {
    res.status(405).send("Method not allowed")
  }
})

module.exports = router

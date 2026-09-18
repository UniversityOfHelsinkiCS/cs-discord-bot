const router = require("express").Router();

router.all("/{*splat}", (req, res) => {
  res.redirect("/");
});

module.exports = router;
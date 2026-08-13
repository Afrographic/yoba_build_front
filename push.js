const express = require("express");
const router = express.Router();
const { Security } = require("../utils/security");
const { serverError } = require("../utils/server_error");
const { Thoth_DB } = require("../thoth_db");

router.post("/push/subscribe", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let endpoint = req.body.endpoint;
    let p256dh = req.body.p256dh;
    let auth = req.body.auth;
    let data = await Thoth_DB.delete_data(
      "delete from push_subscriptions where user_id=:user_id",
      { user_id },
    );
   
    await Thoth_DB.post_data(
      "insert into push_subscriptions(endpoint,p256dh,auth,user_id) values(:endpoint,:p256dh,:auth,:user_id)",
      { endpoint, p256dh, auth, user_id },
    );
    res.sendStatus(201);
  } catch (error) {
    serverError(error, res);
  }
});

module.exports = router;

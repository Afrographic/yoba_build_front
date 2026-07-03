const express = require("express");
const router = express.Router();
const { Security } = require("../utils/security");
const { Validator } = require("../utils/validator");
const { HelperFunction } = require("../utils/helper_function");
const { HelperFile } = require("../utils/helper_file.js");
const { OwnerShipChecker } = require("../utils/ownership_checker.js");
const { Consts } = require("../consts.js");
const { serverError } = require("../utils/server_error.js");
const { DB } = require("../db.js");
const { SMS_Service } = require("../services/sms_service.js");
const { EmailService } = require("../services/email_service.js");
const { User_Controller } = require("../controllers/user_controller.js");
const { Chat_Controller } = require("../controllers/chat_controller.js");
const webpush = require("web-push");



router.post("/push/subscribe", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let endpoint = req.body.endpoint;
    let p256dh = req.body.p256dh;
    let auth = req.body.auth;
    let data = await DB.get_data("select * from push_subscriptions where endpoint=:endpoint",{endpoint});
    if(data.length >0) return  res.sendStatus(201);
    await DB.post_data(
      "insert into push_subscriptions(endpoint,p256dh,auth,user_id) values(:endpoint,:p256dh,:auth,:user_id)",
      { endpoint, p256dh, auth, user_id },
    );
    res.sendStatus(201);
  } catch (error) {
    serverError(error, res);
  }
});

router.post("/push/send", async (req, res) => {
  try {
    const payload = JSON.stringify({
      title: req.body.title,
      body: req.body.message,
      icon: req.body.icon,
    });

    let subscriptions = await DB.get_data("select * from push_subscriptions");
    await Promise.all(
      subscriptions.map((sub) => webpush.sendNotification(sub, payload)),
    );

    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

module.exports = router;

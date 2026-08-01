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
const {
  Notification_Controller,
} = require("../controllers/notification_controller.js");

//Search for a product in a user store
router.post("/search_notif", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let search_token = req.body.search_token;
    let notifs = await DB.get_data(
      `select * from notification where notif_content like '%${search_token}%' and user_id=${user_id}`,
      {},
    );

    res.send(notifs);
  } catch (error) {
    serverError(error, res);
  }
});

router.get("/notif/:offset", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    //Mark all notification as read
    await DB.update_data(
      "update notification set is_read = 1 where user_id=:user_id",
      { user_id },
    );
    let offset = parseInt(req.params.offset);
    let limit = 30;
    let notifs = await DB.get_data(
      "select * from notification where user_id=:user_id  order by  notif_id DESC limit :limit offset :offset",
      { user_id, offset, limit },
    );
    res.send(notifs);
  } catch (error) {
    serverError(error, res);
  }
});

router.get("/notif-unread", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let total = await DB.get_data(
      "select count(*) as total from notification where user_id=:user_id and is_read = 0",
      { user_id },
    );
    res.send({ total: total[0].total });
  } catch (error) {
    serverError(error, res);
  }
});

router.get("/total_notif", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let total = await DB.get_data(
      "select count(*) as total from notification where user_id = :user_id",
      { user_id },
    );
    res.send({ total: total[0].total });
  } catch (error) {
    serverError(error, res);
  }
});

router.post(
  "/notify_user",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let message = req.body.message;
      let country_id = req.body.country_id;
      if (country_id == 0) {
        //Notify everybody
        let users = await DB.get_data("select user_id,user_email from user");
        for (let i = 0; i <= users.length - 1; i++) {
          let user_id = users[i].user_id;
          let user_email = users[i].user_email;
         
          Notification_Controller.new_notif(user_id, message);
          EmailService.send_email(user_email, "Notification BestDeal", message);
        }
      } else {
        //Notify a specific country
        let users = await DB.get_data(
          "select user_id,user_email from user where pays_id=:country_id",
          { country_id },
        );
        for (let i = 0; i <= users.length - 1; i++) {
          let user_id = users[i].user_id;
          let user_email = users[i].user_email;

          Notification_Controller.new_notif(user_id, message);
          EmailService.send_email(user_email, "Notification BestDeal", message);
        }
      }
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

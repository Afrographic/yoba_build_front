const express = require("express");
const router = express.Router();

const { Security } = require("../utils/security");
const { Validator } = require("../utils/validator");
const { HelperFunction } = require("../utils/helper_function");
const { HelperFile } = require("../utils/helper_file.js");
const { OwnerShipChecker } = require("../utils/ownership_checker.js");
const { Consts } = require("../consts.js");
const { Thoth_DB } = require("../thoth_db");
const { serverError } = require("../utils/server_error.js");
const { Drive_Service } = require("../services/drive/drive.js");

router.get("/notif/:offset", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    //Mark all notification as read
    await Thoth_DB.update_data(
      "update notification set is_read = 1 where user_id=:user_id",
      { user_id },
    );
    let offset = parseInt(req.params.offset);
    let limit = 50;
    let notifs = await Thoth_DB.get_data(
      "select * from notification where user_id=:user_id  order by  id DESC limit :limit offset :offset",
      { user_id, offset, limit },
    );
    res.send(notifs);
  } catch (error) {
    serverError(error, res);
  }
});

router.get("/total_notif", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let total = await Thoth_DB.get_data(
      "select count(*) as total from notification where user_id = :user_id",
      { user_id },
    );
    res.send({ total: total[0].total });
  } catch (error) {
    serverError(error, res);
  }
});


router.get("/notif-unread", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let total = await Thoth_DB.get_data(
      "select count(*) as total from notification where user_id=:user_id and is_read = 0",
      { user_id },
    );
    res.send({ total: total[0].total });
  } catch (error) {
    serverError(error, res);
  }
});

module.exports = router;

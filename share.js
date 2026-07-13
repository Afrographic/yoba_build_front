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

router.post("/share", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let offre_id = req.body.offre_id;
    let created_at = new Date();
    await DB.post_data(
      "insert into share(user_id,offre_id,created_at) values(:user_id,:offre_id,:created_at)",
      {
        user_id,
        offre_id,
        created_at,
      },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

module.exports = router;

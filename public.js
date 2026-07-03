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
const { Retrait_Controller } = require("../controllers/retrait_controller.js");
const {
  Notification_Controller,
} = require("../controllers/notification_controller.js");
const { Offre_Controller } = require("../controllers/offre_controller.js");

//get public profile data
router.get("/public_profile/:user_id", async (req, res) => {
  try {
    let user_id = parseInt(req.params.user_id);
    let users = await DB.get_data(
      "select user_id,user_created_date,user_bio,user_avatar from user where user_id=:user_id",
      { user_id }
    );
    if (users.length == 0) return res.sendStatus(404);
    res.send({ user: users[0] });
  } catch (error) {
    serverError(error, res);
  }
});

//Get user public offres list
router.get("/public_user_offre/:offset/user/:user_id",Security.authenticateToken, async (req, res) => {
  try {
    let user_id_loggedIn = req.body.user_data.user_id;
    let user_id = req.params.user_id;
    let offset = parseInt(req.params.offset);
    let limit = 30;

    let offres = await DB.get_data(
      "select * from offre where user_id=:user_id  order by  offre_id DESC limit :limit offset :offset",
      { user_id, offset, limit }
    );

   offres = await Offre_Controller.getOffreMetadatas(user_id_loggedIn,offres);

    res.send(offres);
  } catch (error) {
    serverError(error, res);
  }
});

router.get("/public_total_offre/:user_id", async (req, res) => {
  try {
    let user_id = req.params.user_id;
    let total = await DB.get_data(
      "select count(*) as total from offre where user_id = :user_id",
      { user_id }
    );
    res.send({ total: total[0].total });
  } catch (error) {
    serverError(error, res);
  }
});


module.exports = router;

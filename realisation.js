const express = require("express");
const router = express.Router();
const { Security } = require("../utils/security.js");
const { Validator } = require("../utils/validator.js");
const { HelperFunction } = require("../utils/helper_function.js");
const { HelperFile } = require("../utils/helper_file.js");
const { OwnerShipChecker } = require("../utils/ownership_checker.js");
const { Consts } = require("../consts.js");
const { serverError } = require("../utils/server_error.js");
const { DB } = require("../db.js");
const { SMS_Service } = require("../services/sms_service.js");
const { EmailService } = require("../services/email_service.js");
const { User_Controller } = require("../controllers/user_controller.js");
const { Offre_Controller } = require("../controllers/offre_controller.js");
const {
  OffreVideoRepository,
} = require("../repositories/offre_video_repository.js");
const { OffreService } = require("../services/offre_service.js");

router.post("/realisation", async (req, res) => {
  try {
    let { titre, description, images, videos, link, structure_id } = req.body;
    if (titre.trim().length == 0) {
      return res.sendStatus(400);
    }
    await DB.post_data(
      "insert into realisation(titre,description,link,images,videos,structure_id) values(:titre,:description,:link,:images,:videos,:structure_id)",
      { titre, description, link, images, videos, structure_id },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

module.exports = router;

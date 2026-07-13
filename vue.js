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
const { Vue_Controller } = require("../controllers/vue_controller.js");


router.post("/add_vue",Security.authenticateToken,async(req,res)=>{
    try {
        let user_id = req.body.user_data.user_id;
        let offre_id = req.body.offre_id;
        await Vue_Controller.add_vue(user_id,offre_id);
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})

router.get("/total_vue/:offre_id",Security.authenticateToken,async(req,res)=>{
    try {
        let offre_id = parseInt(req.params.offre_id);
        let total = await Vue_Controller.count_vue(offre_id);
        res.send({total:total});
    } catch (error) {
        serverError(error,res);
    }
})

module.exports = router;
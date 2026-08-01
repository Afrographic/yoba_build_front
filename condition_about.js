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


//Get app about
router.get("/about",async(req,res)=>{
    try {
        let about = await DB.get_data("select app_about from condition_and_about");
        res.send({app_about:about[0].app_about});
    } catch (error) {
        serverError(error,res);
    }
})

//Update A propos
router.patch("/about",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let about = req.body.about;
        await DB.update_data("update condition_and_about set app_about=:about",{about});
        res.sendStatus(200)
    } catch (error) {
        serverError(error,res);
    }
})

// Get App condition of use
router.get("/condition",async(req,res)=>{
    try {
        let condition = await DB.get_data("select app_condition_use from condition_and_about");
        res.send({condition_use:condition[0].app_condition_use});
    } catch (error) {
        serverError(error,res);
    }
})

//Update  condition d'utilisation
router.patch("/condition_use",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let condition = req.body.condition;
        await DB.update_data("update condition_and_about set app_condition_use=:condition",{condition});
        res.sendStatus(200)
    } catch (error) {
        serverError(error,res);
    }
})


module.exports = router;
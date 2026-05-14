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

router.get("/faq",async(req,res)=>{
    try {
        let faq = await DB.get_data("select * from faq order by faq_id DESC");
        res.send(faq);
    } catch (error) {
        serverError(error,res)
    }
})


router.post("/faq",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let question = req.body.question;
        let reponse = req.body.reponse;
        let insert = await DB.post_data("insert into faq(faq_question,faq_reponse) values(:question,:reponse)",{question,reponse});
        res.send({faq_id:insert[0]});
    } catch (error) {
        serverError(error,res);
    }
})

router.delete("/faq/:faq_id",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let faq_id = req.params.faq_id;
        await DB.delete_data("delete from faq where faq_id=:faq_id",{faq_id});
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})

router.patch("/faq/:faq_id",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let faq_id = parseInt(req.params.faq_id);
        let faq_question = req.body.faq_question;
        let faq_reponse = req.body.faq_reponse;
        await DB.update_data("update faq set faq_question=:faq_question, faq_reponse=:faq_reponse where faq_id=:faq_id",{faq_question,faq_reponse,faq_id});
        res.sendStatus(200); 
    } catch (error) {
        serverError(error,res);
    }
})

router.get("/faq/:faq_id",async(req,res)=>{
    try {
        let faq_id = parseInt(req.params.faq_id);
        let faqs = await DB.get_data("select * from faq where faq_id=:faq_id",{faq_id})
        res.send(faqs);
    } catch (error) {
        serverError(error,res);
    }
})

 
module.exports = router;
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
const { Notification_Controller } = require("../controllers/notification_controller.js");
const { Offre_Controller } = require("../controllers/offre_controller.js");

router.get("/signal_offres",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let signals_id = await DB.get_data("select * from signal_offre");
        let offres = [];
        console.log(signals_id);
        for(let i = 0 ; i<=signals_id.length-1;i++){
            let offre_id = signals_id[i].offre_id;
            let offre = await Offre_Controller.get_offre_item(offre_id);
            offres.push(offre);
        }
        res.send(offres);
    } catch (error) {
        serverError(error,res);
    }
})

router.get("/signal_offre/:offre_id",Security.authenticateToken,async(req,res)=>{
    try {
        let offre_id = parseInt(req.params.offre_id);
        let offres = await DB.get_data("select * from signal_offre where offre_id=:offre_id",{offre_id});
        if(offres.length > 0 ){
            return res.sendStatus(200);
        }
        await DB.post_data("insert into signal_offre(offre_id) values(:offre_id)",{offre_id});
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})

router.delete("/tolerer_offre/:offre_id",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let offre_id = parseInt(req.params.offre_id);
        await DB.delete_data("delete from signal_offre where offre_id=:offre_id",{offre_id});
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})


router.delete("/delete_signal_offre/:offre_id",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let offre_id = parseInt(req.params.offre_id);
        await DB.delete_data("delete from signal_offre where offre_id=:offre_id",{offre_id});
         //Delete images from server
         let offres_images = await Offre_Controller.get_offre_images(offre_id);
         for(const item of offres_images){
             HelperFile.deleteFileFromServer(item.url);
         }
         await DB.delete_data("delete from offre where offre_id=:offre_id",{offre_id});
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})


module.exports = router;
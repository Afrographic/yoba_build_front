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

router.get("/countries",async(req,res)=>{
    try { 
        let countries = await DB.get_data("select * from country order by country_name DESC");
        res.send(countries);
    } catch (error) {
        serverError(error,res);
    }
})

router.get("/total_pays",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let total = await DB.get_data("select count(*) as total from country");
        res.send({total:total[0].total});
    } catch (error) {
        serverError(error,res);
    }
})

router.delete("/country/:country_id", [Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let country_id = parseInt(req.params.country_id);
        await DB.delete_data("delete from country where country_id=:country_id",{country_id});
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res)
    }
})

router.post("/country",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let country_name = req.body.country_name;
        let monnaie = req.body.monnaie;
        let code ="+"
        if(country_name == undefined) return res.sendStatus(400);
        if(country_name.trim().length == 0) return res.sendStatus(400);
        let insert  = await DB.post_data("insert into country(country_name,code,monnaie) values(:country_name,:code,:monnaie)",{country_name,code,monnaie});
        res.send({country_id:insert[0]});
    } catch (error) {
        serverError(error,res);
    }
})

module.exports = router;

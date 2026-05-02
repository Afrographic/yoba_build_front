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

router.get("/region/:country_id",async(req,res)=>{
    try {
        let country_id = parseInt(req.params.country_id);
        let regions = await DB.get_data("select * from region where country_id=:country_id order by region_name DESC",{country_id});
        res.send(regions);
    } catch (error) {
        serverError(error,res);
    }
})

router.get("/total_region/:country_id",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let country_id = parseInt(req.params.country_id);
        let total = await DB.get_data("select count(*) as total from region where country_id=:country_id",{country_id});
        res.send({total:total[0].total})
    } catch (error) {
        serverError(error,res);
    }
})

router.delete("/region/:region_id",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let region_id = parseInt(req.params.region_id);
        await DB.delete_data("delete from region where region_id=:region_id",{region_id});
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res)
    }
})

router.post("/region",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let region_name = req.body.region_name;
        let country_id = req.body.country_id;
        let insert = await DB.post_data("insert into region(region_name,country_id) values(:region_name,:country_id)",{region_name,country_id});
        res.send({region_id:insert[0]})
    } catch (error) {
        serverError(error,res)
    }
})
module.exports = router;
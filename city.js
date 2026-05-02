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

router.get("/city/:region_id",async(req,res)=>{
    try {
        let region_id = parseInt(req.params.region_id);
        let cities = await DB.get_data("select * from city where region_id=:region_id order by city_name DESC",{region_id});
        res.send(cities);
    } catch (error) {
        serverError(error,res);
    } 
})

router.get("/total_cities/:region_id",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let region_id = parseInt(req.params.region_id);
        let total = await DB.get_data("select count(*) as total from city where region_id=:region_id",{region_id});
        res.send({total:total[0].total})
    } catch (error) {
        serverError(error,res)
    }
})

router.post("/city",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let city_name = req.body.city_name;
        let region_id = req.body.region_id;
        let insert  = await DB.post_data("insert into city(city_name,region_id) values(:city_name,:region_id)",{city_name,region_id});
        res.send({city_id:insert[0]})
    } catch (error) {
        serverError(error,res);
    }
})

router.delete("/city/:city_id",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let city_id = parseInt(req.params.city_id);
        await DB.delete_data("delete from city where city_id =:city_id",{city_id});
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})

module.exports = router;
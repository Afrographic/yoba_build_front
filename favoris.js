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
const { Offre_Controller } = require("../controllers/offre_controller.js");

router.get("/favoris",Security.authenticateToken,async(req,res)=>{
    try {
        let user_id = req.body.user_data.user_id;
        let favoris_ids = await DB.get_data("select * from favoris where user_id=:user_id order by id DESC",{user_id});
        let offres = [];
        for(const item of favoris_ids){
            let offre = await Offre_Controller.get_offre_item(item.offre_id);
            offres.push(offre);
        }
        res.send(offres);
    } catch (error) {
        serverError(error,res);
    }
})

router.post("/favoris",Security.authenticateToken,async(req,res)=>{
    try {
        let user_id = req.body.user_data.user_id;
        let offre_id = req.body.offre_id;

        //Check if already marked as favorite
        let favoris = await DB.get_data("select * from favoris where user_id=:user_id and offre_id=:offre_id",{user_id,offre_id});
        if(favoris.length > 0){
            return res.sendStatus(200);
        }

        let created_at = new Date();
        await DB.post_data("insert into favoris(user_id,offre_id,created_at) values(:user_id,:offre_id,:created_at)",{user_id,offre_id,created_at});
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})

router.delete("/favoris/:offre_id",Security.authenticateToken,async(req,res)=>{
    try {
        let offre_id = parseInt(req.params.offre_id);
        let user_id = req.body.user_data.user_id;
        await DB.delete_data("delete from favoris where offre_id=:offre_id and user_id=:user_id",{offre_id,user_id});
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})


module.exports = router;
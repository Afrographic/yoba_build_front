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

router.get("/comptes_best_deal",Security.authenticateToken,async(req,res)=>{
    try {
        let comptes = await DB.get_data("select * from comptes_best_deal order by compte_id DESC");
        res.send(comptes);
    } catch (error) {
        serverError(error,res);
    }
})

router.post("/comptes_best_deal",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let operateur = req.body.operateur;
        let numero = req.body.numero;
        let nom = req.body.nom;
        await DB.post_data("insert into comptes_best_deal(operateur,numero,nom) values(:operateur,:numero,:nom)",{operateur,numero,nom});
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})

router.delete("/comptes_best_deal/:id",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let id = parseInt(req.params.id);
        await DB.delete_data("delete from comptes_best_deal where compte_id=:id",{id});
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})

router.patch("/comptes_best_deal/:id",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let compte_id = parseInt(req.params.id);
        let operateur = req.body.operateur;
        let numero = req.body.numero;
        let nom = req.body.nom;
        await DB.update_data("update comptes_best_deal set operateur=:operateur,numero=:numero,nom=:nom where compte_id=:compte_id",{operateur,numero,nom,compte_id});
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})

module.exports = router;
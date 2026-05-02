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

//Informations de retrait
router.patch("/retrait_info", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let num_retrait = req.body.num_retrait;
        let nom_retrait = req.body.nom_retrait;
        let operateur = req.body.operateur;
        await DB.update_data(
            "update user set num_retrait=:num_retrait,nom_retrait=:nom_retrait,operateur=:operateur where user_id=:user_id",
            { num_retrait, nom_retrait, operateur, user_id }
        );
        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
});

//Demande de retrait
router.post(
    "/demande_retrait",
    Security.authenticateToken,
    async (req, res) => {
        try {
            let user_id = req.body.user_data.user_id;
            let user_data = await User_Controller.get_user_data(user_id);
            let amount = req.body.montant;
            let password = Security.encryptPassword(req.body.password);

            if (password != user_data.user_password) return res.sendStatus(503);
            let created_at = new Date();
            if (amount > user_data.solde) return res.sendStatus(403);
            await DB.post_data(
                "insert into retrait(amount,created_at,user_id) values(:amount,:created_at,:user_id)",
                { amount, created_at, user_id }
            );
            res.sendStatus(200);
        } catch (error) {
            serverError(error, res);
        }
    }
);

//Demande de retraits
router.get(
    "/get_demande_retraits",
    [Security.authenticateToken, Security.is_admin],
    async (req, res) => {
        try {
            let retraits = await DB.get_data(
                "select * from retrait where valide = 0 order by retrait_id DESC"
            );
            for (let i = 0; i <= retraits.length - 1; i++) {
                retraits[i].user_data = await Retrait_Controller.get_user_meta_data(
                    retraits[i].user_id
                );
            }
            res.send(retraits);
        } catch (error) {
            serverError(error, res);
        }
    }
);

//Reject demande de retrait
router.post(
    "/reject_retrait/:retrait_id",
    [Security.authenticateToken, Security.is_admin],
    async (req, res) => {
        try {
            let message = req.body.message;
            let retrait_id = parseInt(req.params.retrait_id);
            let retrait_item = await Retrait_Controller.get_retrait_data(retrait_id);
            let user_id = retrait_item.user_id;
            let user_data = await User_Controller.get_user_data(user_id);
            Notification_Controller.new_notif(
                user_data.user_id,
                `Votre demande de retrait de ${retrait_item.amount}F a ete rejete.\n -${message}`
            );
            EmailService.send_email(
                user_data.user_email,
                "Retrait rejetee - BestDeal",
                `Votre demande de retrait de ${retrait_item.amount}F a ete rejete.\n -${message}`
            );
            await DB.delete_data("delete from retrait where retrait_id=:retrait_id", {
                retrait_id,
            });
            res.sendStatus(200);
        } catch (error) {
            serverError(error, res);
        }
    }
);

//Accept demande retrait
router.patch(
    "/accept_retrait/:retrait_id",
    [Security.authenticateToken, Security.is_admin],
    async (req, res) => {
        try {
            let retrait_id = parseInt(req.params.retrait_id);
            let retrait_item = await Retrait_Controller.get_retrait_data(retrait_id);
            let user_id = retrait_item.user_id;
            let amount = retrait_item.amount;
            let user_data = await User_Controller.get_user_data(user_id);
            Notification_Controller.new_notif(
                user_data.user_id,
                `Votre demande de retrait de ${retrait_item.amount}F a ete traite. veuillez consulter votre compte de retrait.`
            );
            EmailService.send_email(
                user_data.user_email,
                "Retrait Accepte - BestDeal",
                `Votre demande de retrait de ${retrait_item.amount}F a ete traite. veuillez consulter votre compte de retrait.`
            );
            await DB.update_data(
                "update retrait set valide = 1 where retrait_id=:retrait_id",
                { retrait_id }
            );
            await DB.update_data(
                "update user set solde = solde - :amount where user_id=:user_id",
                { amount, user_id }
            );

            //Record history
            let created_at = new Date();

            DB.post_data(
                "insert into history_retrait(amount,user_id,created_at) values(:amount,:user_id,:created_at)",
                {
                    amount,
                    user_id,
                    created_at,
                }
            );

            res.sendStatus(200);
        } catch (error) {
            serverError(error, res);
        }
    }
);

//Get all demande de depot
router.get(
    "/depots",
    [Security.authenticateToken, Security.is_admin],
    async (req, res) => {
        try {
            let depots = await DB.get_data(
                "select * from depot where valide = 0 order by depot_id DESC"
            );
            for (let i = 0; i <= depots.length - 1; i++) {
                depots[i].user_info = await User_Controller.get_basic_info(
                    depots[i].user_id
                );
            }
            res.send(depots);
        } catch (error) {
            serverError(error, res);
        }
    }
);

//Demande de depot
router.post("/demande_depot", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let montant = req.body.montant;
        if (req.files == undefined) return res.sendStatus(400);
        if (montant.trim().length == 0) return res.sendStatus(400);
        let file = req.files.file;
        let uid = HelperFunction.generate_unique_id_from_time();
        let created_at = new Date();

        file.mv(
            `./public/backend_files/depot_${uid}${HelperFunction.replace_space_with_underscore(
                file.name
            )}`
        );
        let url = `${Consts.backend_host
            }/backend_files/depot_${uid}${HelperFunction.replace_space_with_underscore(
                file.name
            )}`;
        await DB.post_data(
            "insert into depot(created_at,user_id,url,montant) values(:created_at,:user_id,:url,:montant)",
            { created_at, user_id, url, montant }
        );
        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
});

//Confirmer le depot
router.get(
    "/confirm_depot/:depot_id",
    [Security.authenticateToken, Security.is_admin],
    async (req, res) => {
        try {
            let depot_id = req.params.depot_id;
            let depots = await DB.get_data(
                "select * from depot where depot_id=:depot_id",
                { depot_id }
            );
            let montant = parseInt(depots[0].montant);
            let user_id = depots[0].user_id;
            await DB.update_data(
                "update depot set valide = 1 where depot_id=:depot_id",
                { depot_id }
            );
            await DB.update_data(
                "update user set solde = solde + :montant where user_id=:user_id",
                { montant, user_id }
            );

            let message = `Votre recharge de ${montant} F a ete confirmee`;
            Notification_Controller.new_notif(user_id, message);
            let user_data = await User_Controller.get_user_data(user_id);
            EmailService.send_email(
                user_data.user_email,
                "BestDeal - Recharge Confirme",
                message
            );

            //Record history
            let created_at = new Date();
            let amount = montant;
            DB.post_data(
                "insert into history_depot(amount,user_id,created_at) values(:amount,:user_id,:created_at)",
                {
                    amount,
                    user_id,
                    created_at,
                }
            );

            res.sendStatus(200);
        } catch (error) {
            serverError(error, res);
        }
    }
);

//Rejeter le depot
router.post(
    "/reject_depot/:depot_id",
    [Security.authenticateToken, Security.is_admin],
    async (req, res) => {
        try {
            let depot_id = req.params.depot_id;
            let raison = req.body.raison;
            let depots = await DB.get_data(
                "select * from depot where depot_id=:depot_id",
                { depot_id }
            );
            let montant = depots[0].montant;
            let user_id = depots[0].user_id;
            let message = `Votre recharge de ${montant} F a ete rejetee \n -${raison}`;
            Notification_Controller.new_notif(user_id, message);
            let user_data = await User_Controller.get_user_data(user_id);
            EmailService.send_email(
                user_data.user_email,
                "Recharge rejetee",
                message
            );
            await DB.delete_data("delete from depot where depot_id=:depot_id", {
                depot_id,
            });
            res.sendStatus(200);
        } catch (error) {
            serverError(error, res);
        }
    }
);

//get history depot
router.get("/history_depot", Security.authenticateToken, async (req, res) => {
    try {
        let depots = await DB.get_data(
            "select * from history_depot order by id DESC limit 700"
        );
        for (let i = 0; i <= depots.length - 1; i++) {
            depots[i].user_info = await User_Controller.get_basic_info(
                depots[i].user_id
            );
        }
        res.send(depots);
    } catch (error) {
        serverError(error, res);
    }
});

//get history depot
router.get("/history_retrait", Security.authenticateToken, async (req, res) => {
    try {
        let retraits = await DB.get_data(
            "select * from history_retrait order by id DESC limit 700"
        );
        for (let i = 0; i <= retraits.length - 1; i++) {
            retraits[i].user_info = await User_Controller.get_basic_info(
                retraits[i].user_id
            );
        }
        res.send(retraits);
    } catch (error) {
        serverError(error, res);
    }
});

//admin ajouter l'argent
router.post(
    "/ajouter_money",
    [Security.authenticateToken, Security.is_admin],
    async (req, res) => {
        try {
            let montant = req.body.montant;
            let user_id = req.body.user_id;
            await DB.update_data(
                "update user set solde = solde + :montant where user_id=:user_id",
                { montant, user_id }
            );
            //Record history
            let created_at = new Date();
            let amount = montant;
            DB.post_data(
                "insert into history_depot(amount,user_id,created_at) values(:amount,:user_id,:created_at)",
                {
                    amount,
                    user_id,
                    created_at,
                }
            );
            res.sendStatus(200);
        } catch (error) {
            serverError(error, res);
        }
    }
);

//admin retirer l'argent

router.post(
    "/retirer_money",
    [Security.authenticateToken, Security.is_admin],
    async (req, res) => {
        try {
            let montant = req.body.montant;
            let user_id = req.body.user_id;
            await DB.update_data(
                "update user set solde = solde - :montant where user_id=:user_id",
                { montant, user_id }
            );
            //Record history
            let created_at = new Date();
            let amount = montant;

            DB.post_data(
                "insert into history_retrait(amount,user_id,created_at) values(:amount,:user_id,:created_at)",
                {
                    amount,
                    user_id,
                    created_at,
                }
            );
            res.sendStatus(200);
        } catch (error) {
            serverError(error, res);
        }
    }
);


// get min retrait
router.get("/min_retrait",Security.authenticateToken,async(req,res)=>{
    try {
        let min = await DB.get_data("select * from min_retrait");
        res.send({min:min[0].min});
    } catch (error) {
        serverError(error,res);
    }
})

//edit min retrait
router.patch("/min_retrait",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let min = req.body.min;
        await DB.update_data("update min_retrait set min=:min",{min});
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})
module.exports = router;

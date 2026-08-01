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
const { Offre_Controller } = require("../controllers/offre_controller.js");
const {
  OffreVideoRepository,
} = require("../repositories/offre_video_repository.js");
const { OffreService } = require("../services/offre_service.js");

router.post("/locale", Security.authenticateToken, async (req, res) => {
  try {
    let nom = req.body.locale;
    let user_id = req.body.user_data.user_id;
    let structure_id = req.body.structure_id;

    await DB.post_data(
      "insert into locaux(nom,user_id,structure_id) values(:nom,:user_id,:structure_id)",
      {
        nom,
        user_id,
        structure_id,
      },
    );

    res.sendStatus(201);
  } catch (error) {
    serverError(error, res);
  }
});

//Recuperer les locaux
router.get(
  "/locaux/structures/:id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let structure_id = parseInt(req.params.id);
      let locaux = await DB.get_data(
        "select * from locaux where structure_id=:structure_id",
        { structure_id },
      );
      res.send(locaux);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Edit name
router.patch("/locaux/:id", Security.authenticateToken, async (req, res) => {
  try {
    let nom = req.body.nom;
    let user_id = req.body.user_data.user_id;
    let id = parseInt(req.params.id);
    await DB.update_data(
      "update locaux set nom=:nom where id=:id and user_id=:user_id",
      { nom, id, user_id },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

//Delete locale
router.delete("/locale/:id",Security.authenticateToken,async(req,res)=>{
    try {
        let id = parseInt(req.params.id);
        let user_id = req.body.user_data.user_id;
        await DB.delete_data("delete from locaux where id=:id and user_id=:user_id",{id,user_id})
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})

//Edit GPS coordinate of a locale
router.patch("/locale-geo/:id",Security.authenticateToken,async(req,res)=>{
    try {
        let id = parseInt(req.params.id);
        let geo_lat = req.body.geo_lat;
        let geo_long = req.body.geo_long;
        let user_id = req.body.user_data.user_id;
        await DB.update_data("update locaux set geo_lat=:geo_lat,geo_long=:geo_long where id=:id and user_id=:user_id",{
            geo_lat,geo_long,user_id,id
        })
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})

module.exports = router;

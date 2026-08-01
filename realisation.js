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

router.post("/realisation",Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let { titre, description, images, videos, link, structure_id } = req.body;
    if (titre.trim().length == 0) {
      return res.sendStatus(400);
    }
    await DB.post_data(
      "insert into realisation(titre,description,link,images,videos,structure_id,user_id) values(:titre,:description,:link,:images,:videos,:structure_id,:user_id)",
      { titre, description, link, images, videos, structure_id,user_id },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

router.patch("/realisation/:id",Security.authenticateToken, async (req, res) => {
  try {
    let id = parseInt(req.params.id);
    let user_id = req.body.user_data.user_id;
    let { titre, description, images, videos, link } = req.body;
    if (titre.trim().length == 0) {
      return res.sendStatus(400);
    }
    await DB.post_data(
      "update realisation set titre=:titre,description=:description,link=:link,images=:images,videos=:videos where id=:id and user_id=:user_id ",
      { titre, description, link, images, videos, id,user_id },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

router.get(
  "/realisation/:structure_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let structure_id = parseInt(req.params.structure_id);
      let data = await DB.get_data(
        "select * from realisation where structure_id=:structure_id ",
        { structure_id },
      );
      res.send(data);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get("/realisation-one/:id",Security.authenticateToken,async(req,res)=>{
    try {
        let id = parseInt(req.params.id);
        let data = await DB.get_data("select * from realisation where id=:id",{id});
        res.send(data[0])
    } catch (error) {
        serverError(error,res);
    } 
})

router.delete("/realisation/:id",Security.authenticateToken,async(req,res)=>{
    try {
        let id = parseInt(req.params.id);
        let user_id = req.body.user_data.user_id;
        await DB.delete_data("delete from realisation where id=:id and user_id=:user_id",{id,user_id})
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})
module.exports = router;

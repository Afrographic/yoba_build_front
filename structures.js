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

router.post("/structures", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;

    let {
      logo,
      banniere,
      nom,
      description,
      registre_url,
      attestation_url,
      heure_ouverture,
      heure_fermeture,
      jours_ouvrables,
      secteur,
      locaux,
    } = req.body;

    if (nom.trim().length == 0) {
      return res.sendStatus(400);
    }
    if (secteur.trim().length == 0) {
      return res.sendStatus(400);
    }

    let data = await DB.post_data(
      `
      INSERT INTO structures
      (
        logo,
        banniere,
        nom,
        description,
        registre_url,
        attestation_url,
        heure_ouverture,
        heure_fermeture,
        jours_ouvrables,
        user_id,
        secteur
      )
      VALUES
      (
        :logo,
        :banniere,
        :nom,
        :description,
        :registre_url,
        :attestation_url,
        :heure_ouverture,
        :heure_fermeture,
        :jours_ouvrables,
        :user_id,
        :secteur
      )
      `,
      {
        logo,
        banniere,
        nom,
        description,
        registre_url,
        attestation_url,
        heure_ouverture,
        heure_fermeture,
        jours_ouvrables: jours_ouvrables,
        user_id,
        secteur,
      },
    );

    //Ajouter les locaux
    locaux = JSON.parse(locaux);
    let structure_id = data[0];
    for (const nom of locaux) {
      await DB.post_data(
        "insert into locaux(structure_id,nom,user_id) values(:structure_id,:nom,:user_id)",
        {
          structure_id,
          nom,
          user_id
        },
      );
    }

    res.sendStatus(201);
  } catch (error) {
    serverError(error, res);
  }
});

//Edit structure
router.patch(
  "/structures/:id",
  [Security.authenticateToken],
  async (req, res) => {
    try {
      let id = parseInt(req.params.id);
      const user_id = req.body.user_data.user_id;

      let {
        logo,
        banniere,
        nom,
        description,
        registre_url,
        attestation_url,
        heure_ouverture,
        heure_fermeture,
        jours_ouvrables,
        secteur,
      } = req.body;

      if (nom.trim().length == 0) {
        return res.sendStatus(400);
      }
      if (secteur.trim().length == 0) {
        return res.sendStatus(400);
      }

      await DB.post_data(
        `
        UPDATE structures set
        logo=:logo,
        banniere=:banniere,
        nom=:nom,
        description=:description,
        registre_url=:registre_url,
        attestation_url=:attestation_url,
        heure_ouverture=:heure_ouverture,
        heure_fermeture=:heure_fermeture,
        jours_ouvrables=:jours_ouvrables,
        user_id=:user_id,
        secteur=:secteur
        where id=:id and user_id=:user_id
      `,
        {
          logo,
          banniere,
          nom,
          description,
          registre_url,
          attestation_url,
          heure_ouverture,
          heure_fermeture,
          jours_ouvrables,
          user_id,
          secteur,
          id,
          user_id,
        },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Recuperer les structures d'un utilisateur
router.get("/structures", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let data = await DB.get_data(
      "select * from structures where user_id=:user_id",
      { user_id },
    );
    res.send(data);
  } catch (error) {
    serverError(error, res);
  }
});

router.get("/structures/:id", Security.authenticateToken, async (req, res) => {
  try {
    let id = parseInt(req.params.id);
    let data = await DB.get_data("select * from structures where id=:id", {
      id,
    });
    res.send(data[0]);
  } catch (error) {
    serverError(error, res);
  }
});

router.delete(
  "/structures/:id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let structure_id = parseInt(req.params.id);
      let user_id = req.body.user_data.user_id;
      await DB.delete_data(
        "delete from structures where id=:structure_id and user_id=:user_id",
        { structure_id, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

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
const {
  Notification_Controller,
} = require("../controllers/notification_controller.js");
const { StructureService } = require("../services/structure_service.js");

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
          user_id,
        },
      );
    }

    res.sendStatus(201);
  } catch (error) {
    serverError(error, res);
  }
});

//Search for a structure everywhere
router.post(
  "/search-structure",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let search_token = req.body.search_token;
      let data = await DB.get_data(
        `select * from structures where nom like '%${search_token}%' or description like '%${search_token}%'`,
        {},
      );

      for(let i = 0 ;i<=data.length-1;i++){
        let structure_id = data[i].id;
        let meta_data = await StructureService.getMetaData(structure_id);
        data[i].reviews = meta_data.reviews;
      }

      res.send(data);
    } catch (error) {
      serverError(error, res);
    }
  },
);

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

      await DB.update_data(
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
        secteur=:secteur,
         rejected=0
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
router.get(
  "/user-structures/:user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = parseInt(req.params.user_id);
      let data = await DB.get_data(
        "select * from structures where user_id=:user_id",
        { user_id },
      );
      //get avis
      for (let k = 0; k <= data.length - 1; k++) {
        let structure_id = data[k].id;
        let metaData = await StructureService.getMetaData(structure_id);
        data[k].reviews = metaData.reviews;
        data[k].locaux = metaData.locaux;
      }
      res.send(data);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get("/structures/:id", Security.authenticateToken, async (req, res) => {
  try {
    let id = parseInt(req.params.id);
    let data = await DB.get_data("select * from structures where id=:id", {
      id,
    });
    let metaData = await StructureService.getMetaData(id);
    let user = await User_Controller.get_basic_info(data[0].user_id);
    data[0].locaux = metaData.locaux;
    data[0].reviews = metaData.reviews;
    data[0].user = user;
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

router.get(
  "/structures-to-validate",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let data = await DB.get_data(
        "select * from structures where registre_ok=0 && attestation_ok=0 && rejected=0",
      );
      for (let i = 0; i <= data.length - 1; i++) {
        data[i].user = await User_Controller.get_basic_info(data[i].user_id);
        let metaData = await StructureService.getMetaData(data[i].id);
         data[i].reviews = metaData.reviews;
      }
      res.send(data);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/reject-structure/:id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let structure_id = parseInt(req.params.id);
      let user_id = req.body.user_id;
      let user_name = req.body.user_name;
      let structure_name = req.body.structure_name;
      let reason = req.body.reason;
      await DB.update_data(
        "update structures set rejected = 1 where id=:structure_id",
        { structure_id },
      );
      Notification_Controller.new_notif(
        user_id,
        `Cher ${user_name}, votre structure ${structure_name} a ete rejete - ${reason}`,
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/validate-structure/:id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let structure_id = parseInt(req.params.id);
      let user_id = req.body.user_id;
      let user_name = req.body.user_name;
      let structure_name = req.body.structure_name;
      await DB.update_data(
        "update structures set registre_ok = 1 , attestation_ok=1 where id=:structure_id",
        { structure_id },
      );
      Notification_Controller.new_notif(
        user_id,
        `Cher ${user_name}, votre structure ${structure_name} a ete certifie.`,
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

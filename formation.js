
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
const { Offre_Controller } = require("../controllers/offre_controller.js");
const {
  OffreVideoRepository,
} = require("../repositories/offre_video_repository.js");
const { OffreService } = require("../services/offre_service.js");


// Validate formation payload
function validateFormation({ formation, annee_debut, annee_fin, lieu }) {
  if (
    typeof formation !== "string" ||
    typeof lieu !== "string"
  ) {
    return "Invalid data.";
  }

  formation = formation.trim();
  lieu = lieu.trim();

  if (!formation || !annee_debut || !lieu) {
    return "Missing required fields.";
  }

  if (
    formation.length > 150 ||
    lieu.length > 150
  ) {
    return "One or more fields are too long.";
  }

  const debut = new Date(annee_debut);

  if (isNaN(debut.getTime())) {
    return "Invalid annee_debut.";
  }

  if (annee_fin) {
    const fin = new Date(annee_fin);

    if (isNaN(fin.getTime())) {
      return "Invalid annee_fin.";
    }

    if (fin < debut) {
      return "annee_fin must be after annee_debut.";
    }
  }

  return null;
}

/*==================================================
=                   CREATE
==================================================*/

router.post("/formation", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;

    let {
      formation,
      annee_debut,
      annee_fin,
      lieu,
    } = req.body;

    const error = validateFormation({
      formation,
      annee_debut,
      annee_fin,
      lieu,
    });

    if (error) {
      return res.status(400).json({ message: error });
    }

    formation = formation.trim();
    lieu = lieu.trim();

    const result = await DB.post_data(
      `
      INSERT INTO formation
      (
        formation,
        annee_debut,
        annee_fin,
        lieu,
        user_id
      )
      VALUES
      (
        :formation,
        :annee_debut,
        :annee_fin,
        :lieu,
        :user_id
      )
      `,
      {
        formation,
        annee_debut,
        annee_fin,
        lieu,
        user_id,
      }
    );

    res.status(201).json({
      success: true,
      formation_id: result,
    });
  } catch (error) {
    serverError(error, res);
  }
});

/*==================================================
=                   GET ALL
==================================================*/

router.get("/formations/:user_id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = Number(req.params.user_id);

    const formations = await DB.get_data(
      `
      SELECT
        formation_id,
        formation,
        annee_debut,
        annee_fin,
        lieu
      FROM formation
      WHERE user_id = :user_id
      ORDER BY annee_debut DESC
      `,
      { user_id }
    );

    res.status(200).json(formations);
  } catch (error) {
    serverError(error, res);
  }
});

/*==================================================
=                   GET ONE
==================================================*/

router.get("/formation/:id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;
    const formation_id = Number(req.params.id);

    if (!Number.isInteger(formation_id)) {
      return res.sendStatus(400);
    }

    const rows = await DB.get_data(
      `
      SELECT
        formation_id,
        formation,
        annee_debut,
        annee_fin,
        lieu
      FROM formation
      WHERE
        formation_id = :formation_id
        AND user_id = :user_id
      `,
      {
        formation_id,
        user_id,
      }
    );

    if (rows.length === 0) {
      return res.sendStatus(404);
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    serverError(error, res);
  }
});

/*==================================================
=                   UPDATE
==================================================*/

router.patch("/formation/:id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;
    const formation_id = Number(req.params.id);

    if (!Number.isInteger(formation_id)) {
      return res.sendStatus(400);
    }

    let {
      formation,
      annee_debut,
      annee_fin,
      lieu,
    } = req.body;

    const error = validateFormation({
      formation,
      annee_debut,
      annee_fin,
      lieu,
    });

    if (error) {
      return res.status(400).json({ message: error });
    }

    formation = formation.trim();
    lieu = lieu.trim();

    const result = await DB.post_data(
      `
      UPDATE formation
      SET
        formation = :formation,
        annee_debut = :annee_debut,
        annee_fin = :annee_fin,
        lieu = :lieu
      WHERE
        formation_id = :formation_id
        AND user_id = :user_id
      `,
      {
        formation_id,
        formation,
        annee_debut,
        annee_fin,
        lieu,
        user_id,
      }
    );

    if (result?.affectedRows === 0 || result === 0) {
      return res.sendStatus(404);
    }

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    serverError(error, res);
  }
});

/*==================================================
=                   DELETE
==================================================*/

router.delete("/formation/:id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;
    const formation_id = Number(req.params.id);

    if (!Number.isInteger(formation_id)) {
      return res.sendStatus(400);
    }

    const result = await DB.post_data(
      `
      DELETE FROM formation
      WHERE
        formation_id = :formation_id
        AND user_id = :user_id
      `,
      {
        formation_id,
        user_id,
      }
    );

    if (result?.affectedRows === 0 || result === 0) {
      return res.sendStatus(404);
    }

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    serverError(error, res);
  }
});

module.exports = router;

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



// Validate tarif payload
function validateTarif({ service, prix_min }) {
  if (
    typeof service !== "string" ||
    prix_min === undefined ||
    prix_min === null
  ) {
    return "Invalid data.";
  }

  service = service.trim();

  if (!service) {
    return "Missing required fields.";
  }

  if (service.length > 150) {
    return "Service name is too long.";
  }

  prix_min = Number(prix_min);

  if (Number.isNaN(prix_min) || prix_min < 0) {
    return "Invalid prix_min.";
  }

  return null;
}

/*==================================================
=                   CREATE
==================================================*/

router.post("/tarif", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;

    let {
      service,
      prix_min,
    } = req.body;

    const error = validateTarif({
      service,
      prix_min,
    });

    if (error) {
      return res.status(400).json({ message: error });
    }

    service = service.trim();
    prix_min = Number(prix_min);

    const result = await DB.post_data(
      `
      INSERT INTO tarif
      (
        service,
        prix_min,
        user_id
      )
      VALUES
      (
        :service,
        :prix_min,
        :user_id
      )
      `,
      {
        service,
        prix_min,
        user_id,
      }
    );

    res.status(201).json({
      success: true,
      tarif_id: result,
    });

  } catch (error) {
    serverError(error, res);
  }
});

/*==================================================
=                   GET ALL
==================================================*/

router.get("/tarifs/:user_id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = Number(req.params.user_id);

    const tarifs = await DB.get_data(
      `
      SELECT
        tarif_id,
        service,
        prix_min
      FROM tarif
      WHERE user_id = :user_id
      ORDER BY service ASC
      `,
      {
        user_id,
      }
    );

    res.status(200).json(tarifs);

  } catch (error) {
    serverError(error, res);
  }
});

/*==================================================
=                   GET ONE
==================================================*/

router.get("/tarif/:id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;
    const tarif_id = Number(req.params.id);

    if (!Number.isInteger(tarif_id)) {
      return res.sendStatus(400);
    }

    const rows = await DB.get_data(
      `
      SELECT
        tarif_id,
        service,
        prix_min
      FROM tarif
      WHERE
        tarif_id = :tarif_id
        AND user_id = :user_id
      `,
      {
        tarif_id,
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

router.patch("/tarif/:id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;
    const tarif_id = Number(req.params.id);

    if (!Number.isInteger(tarif_id)) {
      return res.sendStatus(400);
    }

    let {
      service,
      prix_min,
    } = req.body;

    const error = validateTarif({
      service,
      prix_min,
    });

    if (error) {
      return res.status(400).json({ message: error });
    }

    service = service.trim();
    prix_min = Number(prix_min);

    const result = await DB.post_data(
      `
      UPDATE tarif
      SET
        service = :service,
        prix_min = :prix_min
      WHERE
        tarif_id = :tarif_id
        AND user_id = :user_id
      `,
      {
        tarif_id,
        service,
        prix_min,
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

router.delete("/tarif/:id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;
    const tarif_id = Number(req.params.id);

    if (!Number.isInteger(tarif_id)) {
      return res.sendStatus(400);
    }

    const result = await DB.post_data(
      `
      DELETE FROM tarif
      WHERE
        tarif_id = :tarif_id
        AND user_id = :user_id
      `,
      {
        tarif_id,
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
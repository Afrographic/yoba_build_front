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

// Validate disponibilite payload
function validateDisponibilite({ disponibilite }) {
  if (typeof disponibilite !== "string") {
    return "Invalid data.";
  }

  disponibilite = disponibilite.trim();

  if (!disponibilite) {
    return "Disponibilite is required.";
  }

  if (disponibilite.length > 150) {
    return "Disponibilite is too long.";
  }

  return null;
}

/*==================================================
=                   CREATE
==================================================*/

router.post("/disponibilite", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;

    let { disponibilite } = req.body;

    const error = validateDisponibilite({ disponibilite });

    if (error) {
      return res.status(400).json({ message: error });
    }

    disponibilite = disponibilite.trim();

    const result = await DB.post_data(
      `
      INSERT INTO disponibilite
      (
        disponibilite,
        user_id
      )
      VALUES
      (
        :disponibilite,
        :user_id
      )
      `,
      {
        disponibilite,
        user_id,
      }
    );

    res.status(201).json({
      success: true,
      disponibilite_id: result,
    });

  } catch (error) {
    serverError(error, res);
  }
});

/*==================================================
=                   GET ALL
==================================================*/

router.get("/disponibilite/:user_id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = Number(req.params.user_id);

    const rows = await DB.get_data(
      `
      SELECT
        disponibilite_id,
        disponibilite
      FROM disponibilite
      WHERE user_id = :user_id
      ORDER BY disponibilite_id DESC
      `,
      { user_id }
    );

    res.status(200).json(rows);

  } catch (error) {
    serverError(error, res);
  }
});

/*==================================================
=                   GET ONE
==================================================*/

router.get("/disponibilite/:id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;
    const disponibilite_id = Number(req.params.id);

    if (!Number.isInteger(disponibilite_id)) {
      return res.sendStatus(400);
    }

    const rows = await DB.get_data(
      `
      SELECT
        disponibilite_id,
        disponibilite
      FROM disponibilite
      WHERE
        disponibilite_id = :disponibilite_id
        AND user_id = :user_id
      `,
      {
        disponibilite_id,
        user_id,
      }
    );

    if (!rows.length) return res.sendStatus(404);

    res.status(200).json(rows[0]);

  } catch (error) {
    serverError(error, res);
  }
});

/*==================================================
=                   UPDATE
==================================================*/

router.patch("/disponibilite/:id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;
    const disponibilite_id = Number(req.params.id);

    if (!Number.isInteger(disponibilite_id)) {
      return res.sendStatus(400);
    }

    let { disponibilite } = req.body;

    const error = validateDisponibilite({ disponibilite });

    if (error) {
      return res.status(400).json({ message: error });
    }

    disponibilite = disponibilite.trim();

    const result = await DB.post_data(
      `
      UPDATE disponibilite
      SET disponibilite = :disponibilite
      WHERE disponibilite_id = :disponibilite_id
        AND user_id = :user_id
      `,
      {
        disponibilite_id,
        disponibilite,
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

router.delete("/disponibilite/:id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;
    const disponibilite_id = Number(req.params.id);

    if (!Number.isInteger(disponibilite_id)) {
      return res.sendStatus(400);
    }

    const result = await DB.post_data(
      `
      DELETE FROM disponibilite
      WHERE disponibilite_id = :disponibilite_id
        AND user_id = :user_id
      `,
      {
        disponibilite_id,
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
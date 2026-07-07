
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


// Validate langue payload
function validateLangue({ langue, niveau }) {
  if (
    typeof langue !== "string" ||
    typeof niveau !== "string"
  ) {
    return "Invalid data.";
  }

  langue = langue.trim();
  niveau = niveau.trim();

  if (!langue || !niveau) {
    return "Missing required fields.";
  }

  if (
    langue.length > 100 ||
    niveau.length > 100
  ) {
    return "One or more fields are too long.";
  }

  return null;
}

/*==================================================
=                   CREATE
==================================================*/

router.post("/langue", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;

    let {
      langue,
      niveau,
    } = req.body;

    const error = validateLangue({
      langue,
      niveau,
    });

    if (error) {
      return res.status(400).json({ message: error });
    }

    langue = langue.trim();
    niveau = niveau.trim();

    const result = await DB.post_data(
      `
      INSERT INTO langue
      (
        langue,
        niveau,
        user_id
      )
      VALUES
      (
        :langue,
        :niveau,
        :user_id
      )
      `,
      {
        langue,
        niveau,
        user_id,
      }
    );

    res.status(201).json({
      success: true,
      langue_id: result,
    });

  } catch (error) {
    serverError(error, res);
  }
});

/*==================================================
=                   GET ALL
==================================================*/

router.get("/langues/:user_id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = Number(req.params.user_id);

    const langues = await DB.get_data(
      `
      SELECT
        langue_id,
        langue,
        niveau
      FROM langue
      WHERE user_id = :user_id
      ORDER BY langue ASC
      `,
      {
        user_id,
      }
    );

    res.status(200).json(langues);

  } catch (error) {
    serverError(error, res);
  }
});

/*==================================================
=                   GET ONE
==================================================*/

router.get("/langue/:id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;
    const langue_id = Number(req.params.id);

    if (!Number.isInteger(langue_id)) {
      return res.sendStatus(400);
    }

    const rows = await DB.get_data(
      `
      SELECT
        langue_id,
        langue,
        niveau
      FROM langue
      WHERE
        langue_id = :langue_id
        AND user_id = :user_id
      `,
      {
        langue_id,
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

router.patch("/langue/:id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;
    const langue_id = Number(req.params.id);

    if (!Number.isInteger(langue_id)) {
      return res.sendStatus(400);
    }

    let {
      langue,
      niveau,
    } = req.body;

    const error = validateLangue({
      langue,
      niveau,
    });

    if (error) {
      return res.status(400).json({ message: error });
    }

    langue = langue.trim();
    niveau = niveau.trim();

    const result = await DB.post_data(
      `
      UPDATE langue
      SET
        langue = :langue,
        niveau = :niveau
      WHERE
        langue_id = :langue_id
        AND user_id = :user_id
      `,
      {
        langue_id,
        langue,
        niveau,
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

router.delete("/langue/:id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;
    const langue_id = Number(req.params.id);

    if (!Number.isInteger(langue_id)) {
      return res.sendStatus(400);
    }

    const result = await DB.post_data(
      `
      DELETE FROM langue
      WHERE
        langue_id = :langue_id
        AND user_id = :user_id
      `,
      {
        langue_id,
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
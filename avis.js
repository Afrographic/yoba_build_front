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

// ===============================
// VALIDATION
// ===============================
function validateAvis({ avis, star }) {
  if (typeof avis !== "string") {
    return "Invalid avis";
  }

  star = Number(star);

  if (!Number.isInteger(star) || star < 1 || star > 5) {
    return "Star must be an integer between 1 and 5";
  }

  avis = avis.trim();

  if (!avis) return "Avis cannot be empty";
  if (avis.length > 1000) return "Avis too long";

  return null;
}

/*==================================================
=                   UPSERT REVIEW
==================================================*/

router.post("/avis", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;
    const { structure_id, avis, star } = req.body;

    if (!user_id) return res.sendStatus(400);

    const error = validateAvis({ avis, star });
    if (error) return res.status(400).json({ message: error });

    const cleanAvis = avis.trim();
    const rating = Number(star);

    await DB.delete_data(
      "delete  from avis where user_id=:user_id and structure_id=:structure_id",
      { user_id, structure_id },
    );

    await DB.post_data(
      `
      INSERT INTO avis (
        user_id,
        structure_id,
        avis,
        star,
        created_at
      )
      VALUES (
        :user_id,
        :structure_id,
        :avis,
        :star,
        NOW()
      )
      
      `,
      {
        user_id,
        structure_id,
        avis: cleanAvis,
        star: rating,
      },
    );

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    serverError(error, res);
  }
});

/*==================================================
=                   GET ALL REVIEWS OF  a structure
==================================================*/

router.get("/avis/:structure_id", [Security.authenticateToken], async (req, res) => {
  try {
    const structure_id = Number(req.params.structure_id);

    const rows = await DB.get_data(
      `
      SELECT
        *
      FROM avis
      WHERE structure_id = :structure_id
      ORDER BY created_at DESC
      `,
      { structure_id },
    );

    for (let i = 0; i <= rows.length - 1; i++) {
      const user = await User_Controller.get_basic_info(rows[i].user_id);
      rows[i].user = user;
    }

    res.status(200).json(rows);
  } catch (error) {
    serverError(error, res);
  }
});

/*==================================================
=                   GET MY REVIEW
==================================================*/

router.get(
  "/avis/:user_id/me",
  [Security.authenticateToken],
  async (req, res) => {
    try {
      const from_user_id = req.body.user_data.user_id;
      const { user_id } = req.params;

      const rows = await DB.get_data(
        `
      SELECT
        avis_id,
        user_id,
        from_user_id,
        avis,
        star,
        created_at
      FROM avis
      WHERE user_id = :user_id
        AND from_user_id = :from_user_id
      `,
        { user_id, from_user_id },
      );

      if (!rows.length) return res.sendStatus(404);

      res.status(200).json(rows[0]);
    } catch (error) {
      serverError(error, res);
    }
  },
);

/*==================================================
=                   DELETE REVIEW
==================================================*/

router.delete(
  "/avis/:user_id",
  [Security.authenticateToken],
  async (req, res) => {
    try {
      const from_user_id = req.body.user_data.user_id;
      const { user_id } = req.params;

      await DB.post_data(
        `
      DELETE FROM avis
      WHERE user_id = :user_id
        AND from_user_id = :from_user_id
      `,
        { user_id, from_user_id },
      );

      res.status(200).json({
        success: true,
      });
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

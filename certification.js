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

// Validate certification payload
function validateCertification({ certification, annee }) {
  if (typeof certification !== "string") {
    return "Invalid data.";
  }

  certification = certification.trim();

  if (!certification || !annee) {
    return "Missing required fields.";
  }

  if (certification.length > 150) {
    return "Certification is too long.";
  }

  const date = new Date(annee);

  if (isNaN(date.getTime())) {
    return "Invalid annee.";
  }

  return null;
}

/*==================================================
=                   CREATE
==================================================*/

router.post(
  "/certification",
  [Security.authenticateToken],
  async (req, res) => {
    try {
      const user_id = req.body.user_data.user_id;

      let { certification, annee } = req.body;

      const error = validateCertification({
        certification,
        annee,
      });

      if (error) {
        return res.status(400).json({ message: error });
      }

      let certification_url = "";

      if (req.files != undefined) {
        let file = req.files["doc"];
        file.mv(`./public/backend_files/${file.name}`);
        certification_url = `${Consts.backend_host}/backend_files/${file.name}`;
      }

      certification = certification.trim();

      const result = await DB.post_data(
        `
      INSERT INTO certification
      (
        certification,
        annee,
        certification_url,
        user_id
      )
      VALUES
      (
        :certification,
        :annee,
        :certification_url,
        :user_id
      )
      `,
        {
          certification,
          annee,
          certification_url,
          user_id,
        },
      );

      res.status(201).json({
        success: true,
        certification_id: result,
      });
    } catch (error) {
      serverError(error, res);
    }
  },
);

/*==================================================
=                   GET ALL
==================================================*/

router.get(
  "/certifications/:user_id",
  [Security.authenticateToken],
  async (req, res) => {
    try {
      const user_id = Number(req.params.user_id);

      const certifications = await DB.get_data(
        `
      SELECT
        *
      FROM certification
      WHERE user_id = :user_id
      ORDER BY annee DESC
      `,
        {
          user_id,
        },
      );

      res.status(200).json(certifications);
    } catch (error) {
      serverError(error, res);
    }
  },
);

/*==================================================
=                   GET ONE
==================================================*/

router.get(
  "/certification/:id",
  [Security.authenticateToken],
  async (req, res) => {
    try {
      const user_id = req.body.user_data.user_id;
      const certification_id = Number(req.params.id);

      if (!Number.isInteger(certification_id)) {
        return res.sendStatus(400);
      }

      const rows = await DB.get_data(
        `
      SELECT
       *
      FROM certification
      WHERE
        certification_id = :certification_id
        AND user_id = :user_id
      `,
        {
          certification_id,
          user_id,
        },
      );

      if (rows.length === 0) {
        return res.sendStatus(404);
      }

      res.status(200).json(rows[0]);
    } catch (error) {
      serverError(error, res);
    }
  },
);

/*==================================================
=                   UPDATE
==================================================*/

router.patch(
  "/certification/:id",
  [Security.authenticateToken],
  async (req, res) => {
    try {
      const user_id = req.body.user_data.user_id;
      const certification_id = Number(req.params.id);

      if (!Number.isInteger(certification_id)) {
        return res.sendStatus(400);
      }

      let data = await DB.get_data(
        "select certification_url from certification where certification_id=:certification_id",
        {
          certification_id,
        },
      );
      let certification_url = data[0].certification_url;

      if (req.files != undefined) {
        let file = req.files["doc"];
        file.mv(`./public/backend_files/${file.name}`);
        certification_url = `${Consts.backend_host}/backend_files/${file.name}`;
      }

      let { certification, annee } = req.body;

      const error = validateCertification({
        certification,
        annee,
      });

      if (error) {
        return res.status(400).json({ message: error });
      }

      certification = certification.trim();

      const result = await DB.post_data(
        `
      UPDATE certification
      SET
        certification = :certification,
        annee = :annee,
        certification_url = :certification_url
      WHERE
        certification_id = :certification_id
        AND user_id = :user_id
      `,
        {
          certification_id,
          certification,
          annee,
          certification_url,
          user_id,
        },
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
  },
);

/*==================================================
=                   DELETE
==================================================*/

router.delete(
  "/certification/:id",
  [Security.authenticateToken],
  async (req, res) => {
    try {
      const user_id = req.body.user_data.user_id;
      const certification_id = Number(req.params.id);

      if (!Number.isInteger(certification_id)) {
        return res.sendStatus(400);
      }

      const result = await DB.post_data(
        `
      DELETE FROM certification
      WHERE
        certification_id = :certification_id
        AND user_id = :user_id
      `,
        {
          certification_id,
          user_id,
        },
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
  },
);

module.exports = router;

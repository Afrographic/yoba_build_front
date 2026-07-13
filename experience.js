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

// Validate experience payload
function validateExperience({ company, role, start_date, end_date, lieu }) {
  if (
    typeof company !== "string" ||
    typeof role !== "string" ||
    typeof lieu !== "string"
  ) {
    return "Invalid data.";
  }

  company = company.trim();
  role = role.trim();
  lieu = lieu.trim();

  if (!company || !role || !lieu || !start_date) {
    return "Missing required fields.";
  }

  if (
    company.length > 150 ||
    role.length > 150 ||
    lieu.length > 150
  ) {
    return "One or more fields are too long.";
  }

  const start = new Date(start_date);
  if (isNaN(start.getTime())) {
    return "Invalid start_date.";
  }

  if (end_date) {
    const end = new Date(end_date);

    if (isNaN(end.getTime())) {
      return "Invalid end_date.";
    }

    if (end < start) {
      return "end_date must be after start_date.";
    }
  }

  return null;
}

/*==================================================
=                   CREATE
==================================================*/

router.post("/experience", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;

    let {
      company,
      role,
      start_date,
      end_date,
      lieu,
    } = req.body;

    const error = validateExperience({
      company,
      role,
      start_date,
      end_date,
      lieu,
    });

    if (error) {
      return res.status(400).json({ message: error });
    }

    company = company.trim();
    role = role.trim();
    lieu = lieu.trim();

    const result = await DB.post_data(
      `
      INSERT INTO experience
      (
        company,
        role,
        start_date,
        end_date,
        lieu,
        user_id
      )
      VALUES
      (
        :company,
        :role,
        :start_date,
        :end_date,
        :lieu,
        :user_id
      )
      `,
      {
        company,
        role,
        start_date,
        end_date,
        lieu,
        user_id,
      }
    );

    res.status(201).json({
      success: true,
      experience_id: result,
    });
  } catch (error) {
    serverError(error, res);
  }
});

/*==================================================
=                   GET ALL
==================================================*/

router.get("/experience/:user_id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = Number(req.params.user_id);

    const experiences = await DB.get_data(
      `
      SELECT
        experience_id,
        company,
        role,
        start_date,
        end_date,
        lieu
      FROM experience
      WHERE user_id = :user_id
      ORDER BY company ASC
      `,
      { user_id }
    );

    res.status(200).json(experiences);
  } catch (error) {
    serverError(error, res);
  }
});

/*==================================================
=                   GET ONE
==================================================*/

router.get("/experience/:id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;
    const experience_id = Number(req.params.id);

    if (!Number.isInteger(experience_id)) {
      return res.sendStatus(400);
    }

    const rows = await DB.get_data(
      `
      SELECT
        experience_id,
        company,
        role,
        start_date,
        end_date,
        lieu
      FROM experience
      WHERE
        experience_id = :experience_id
        AND user_id = :user_id
      `,
      {
        experience_id,
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

router.patch("/experience/:id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;
    const experience_id = Number(req.params.id);

    if (!Number.isInteger(experience_id)) {
      return res.sendStatus(400);
    }

    let {
      company,
      role,
      start_date,
      end_date,
      lieu,
    } = req.body;

    const error = validateExperience({
      company,
      role,
      start_date,
      end_date,
      lieu,
    });

    if (error) {
      return res.status(400).json({ message: error });
    }

    company = company.trim();
    role = role.trim();
    lieu = lieu.trim();

    const result = await DB.post_data(
      `
      UPDATE experience
      SET
        company = :company,
        role = :role,
        start_date = :start_date,
        end_date = :end_date,
        lieu = :lieu
      WHERE
        experience_id = :experience_id
        AND user_id = :user_id
      `,
      {
        experience_id,
        company,
        role,
        start_date,
        end_date,
        lieu,
        user_id,
      }
    );

    // Adapt this check depending on what your DB.post_data returns.
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

router.delete("/experience/:id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;
    const experience_id = Number(req.params.id);

    if (!Number.isInteger(experience_id)) {
      return res.sendStatus(400);
    }

    const result = await DB.post_data(
      `
      DELETE FROM experience
      WHERE
        experience_id = :experience_id
        AND user_id = :user_id
      `,
      {
        experience_id,
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
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

router.post("/competence", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = req.body.user_data.user_id;
    const competence = req.body.competence;

    if (!competence || competence.trim().length === 0)
      return res.sendStatus(400);

     await DB.post_data(
      `
      INSERT INTO competence(user_id, competence)
      VALUES(:user_id, :competence)
      `,
      { user_id, competence },
    );

    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

router.get("/competence/:user_id", [Security.authenticateToken], async (req, res) => {
  try {
    const user_id = Number(req.params.user_id);

    const competences = await DB.get_data(
      `
      SELECT *
      FROM competence
      WHERE user_id = :user_id
      ORDER BY competence ASC
      `,
      { user_id },
    );

    res.status(200).json(competences);
  } catch (error) {
    serverError(error, res);
  }
});

router.patch(
  "/competence/:id",
  [Security.authenticateToken],
  async (req, res) => {
    try {
      const id = req.params.id;
      const user_id = req.body.user_data.user_id;
      const competence = req.body.competence;

      if (!competence || competence.trim().length === 0)
        return res.sendStatus(400);

      await DB.post_data(
        `
      UPDATE competence
      SET competence = :competence
      WHERE competence_id = :id
        AND user_id = :user_id
      `,
        {
          id,
          user_id,
          competence,
        },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.delete(
  "/competence/:id",
  [Security.authenticateToken],
  async (req, res) => {
    try {
      const id = req.params.id;
      const user_id = req.body.user_data.user_id;

      await DB.post_data(
        `
      DELETE FROM competence
      WHERE competence_id = :id
        AND user_id = :user_id
      `,
        { id, user_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

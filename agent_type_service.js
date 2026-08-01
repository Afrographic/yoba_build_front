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
const { JobController } = require("../controllers/job_controller.js");
const {
  Notification_Controller,
} = require("../controllers/notification_controller.js");

router.get(
  "/all-type-service",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let data = await DB.get_data("select * from agent_type_service");
      res.send(data);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.post(
  "/type-service",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let { icon, titre, description } = req.body;
      await DB.post_data(
        "insert into agent_type_service(icon,titre,description) values(:icon,:titre,:description)",
        {
          icon,
          titre,
          description,
        },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.delete(
  "/type-service/:id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let id = Number(req.params.id);
      await DB.delete_data("delete from agent_type_service where id=:id", {
        id,
      });
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get(
  "/type-service/:id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let id = Number(req.params.id);
      let data = await DB.get_data(
        "select * from agent_type_service where id=:id",
        { id },
      );
      res.send(data);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/type-service/:id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let id = Number(req.params.id);
      let { icon, titre, description } = req.body;
      await DB.update_data(
        "update agent_type_service set icon=:icon,titre=:titre,description=:description where id=:id",
        {
          id,
          icon,
          titre,
          description,
        },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

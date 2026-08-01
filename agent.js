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
const Real_Time = require("../services/real_time.js");

async function notifyAdminIfNecessary(user_id) {
  let agents = await DB.get_data(
    "select * from nextbridge where user_id=:user_id",
    { user_id },
  );
  if (agents.length == 0) return;
  let pending = User_Controller.agent_verification_pending(agents[0]);
  if (pending) {
    //Notify admin
    let admins = await DB.get_data("select * from admin");
    let user_data = await User_Controller.get_basic_info(user_id);
    for (let i = 0; i <= admins.length - 1; i++) {
      Notification_Controller.new_notif(
        admins[i].user_id,
        `L'utilisateur ${user_data.user_full_name} souhaite confirme son compte NextBridge! `,
      );
    }
  }
}

router.post(
  "/create-agent-info-pro",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      notifyAdminIfNecessary(user_id);
      let { services, moyens_transport, description } = req.body;
      //check if user has already created a nextbridge account
      let users = await DB.get_data(
        "select user_id from nextbridge where user_id=:user_id",
        { user_id },
      );
      //delete all the agent-service-association
      await DB.delete_data("delete from agent_service where user_id=:user_id", {
        user_id,
      });
      let servicesJson = JSON.parse(services);

      for (let i = 0; i <= servicesJson.length - 1; i++) {
        let service_id = servicesJson[i].id;
        await DB.post_data(
          "insert into agent_service(service_id,user_id) values(:service_id,:user_id)",
          {
            service_id,
            user_id,
          },
        );
      }
      if (users.length > 0) {
        //only update the field
        await DB.update_data(
          "update nextbridge set  active=0,reject_message='',rejected = 0,services=:services,moyens_transport=:moyens_transport,description=:description where user_id=:user_id",
          { services, moyens_transport, description, user_id },
        );
      } else {
        await DB.post_data(
          "insert into nextbridge(user_id,services,moyens_transport,description) values(:user_id,:services,:moyens_transport,:description)",
          { user_id, services, moyens_transport, description },
        );
      }
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.post(
  "/create-agent-zone-disponibilite",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      notifyAdminIfNecessary(user_id);
      let { zones, disponibilite } = req.body;

      //check if user has already created a nextbridge account
      let users = await DB.get_data(
        "select user_id from nextbridge where user_id=:user_id",
        { user_id },
      );
      if (users.length > 0) {
        //only update the field
        await DB.update_data(
          "update nextbridge set  active=0,reject_message='',rejected=0,zones=:zones,disponibilite=:disponibilite where user_id=:user_id",
          { zones, disponibilite, user_id },
        );
      } else {
        await DB.post_data(
          "insert into nextbridge(user_id,zones,disponibilite) values(:user_id,:zones,:disponibilite)",
          { user_id, zones, disponibilite },
        );
      }
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.post(
  "/create-agent-tarifs",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      notifyAdminIfNecessary(user_id);
      let { frais_deplacement, prix_km, prix_verification, commission_achat } =
        req.body;

      //check if user has already created a nextbridge account
      let users = await DB.get_data(
        "select user_id from nextbridge where user_id=:user_id",
        { user_id },
      );
      if (users.length > 0) {
        //only update the field
        await DB.update_data(
          "update nextbridge set  active=0,reject_message='',rejected=0,frais_deplacement=:frais_deplacement,prix_km=:prix_km,prix_verification=:prix_verification,commission_achat=:commission_achat where user_id=:user_id",
          {
            frais_deplacement,
            prix_km,
            prix_verification,
            commission_achat,
            user_id,
          },
        );
      } else {
        await DB.post_data(
          "insert into nextbridge(user_id,frais_deplacement,prix_km, prix_verification,commission_achat) values(:user_id,:frais_deplacement,:prix_km, :prix_verification,:commission_achat)",
          {
            user_id,
            frais_deplacement,
            prix_km,
            prix_verification,
            commission_achat,
          },
        );
      }
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.post(
  "/create-agent-docs",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      notifyAdminIfNecessary(user_id);
      let { docs } = req.body;

      //check if user has already created a nextbridge account
      let users = await DB.get_data(
        "select user_id from nextbridge where user_id=:user_id",
        { user_id },
      );
      if (users.length > 0) {
        //only update the field
        await DB.update_data(
          "update nextbridge set  active=0,reject_message='',rejected=0,docs=:docs where user_id=:user_id",
          { docs, user_id },
        );
      } else {
        await DB.post_data(
          "insert into nextbridge(user_id,docs) values(:user_id,:docs)",
          { user_id, docs },
        );
      }
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get(
  "/nextbridge/:user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = parseInt(req.params.user_id);
      let data = await DB.get_data(
        "select * from nextbridge where user_id=:user_id",
        { user_id },
      );
      res.send(data);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/actvate-agent/:user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = parseInt(req.params.user_id);
      await DB.update_data(
        "update nextbridge set active = 1 where user_id=:user_id",
        { user_id },
      );
      let user_data = await User_Controller.get_basic_info(user_id);
      let notif_content = `Cher ${user_data.user_full_name} , Votre profile nextbridge a ete certifier , Commencer a gagner de l'argent dans BestDeal!`;
      Notification_Controller.new_notif(user_id, notif_content);
      Real_Time.socket.to(`user-${user_id}`).emit("agent_activated", {
        message: notif_content,
      });
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/reject-agent/:user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = parseInt(req.params.user_id);
      let reject_message = req.body.reject_message;
      await DB.update_data(
        "update nextbridge set rejected = 1,reject_message=:reject_message where user_id=:user_id",
        { user_id, reject_message },
      );
      let user_data = await User_Controller.get_basic_info(user_id);
      let notif_content = `Cher ${user_data.user_full_name} , Votre profile nextbridge a ete rejete : ${reject_message}`;
      Notification_Controller.new_notif(user_id, notif_content);

      Real_Time.socket.to(`user-${user_id}`).emit("agent_rejected", {
        message: notif_content,
      });
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get("/nextbridge-percent",Security.authenticateToken,async(req,res)=>{
  try {
    let prix = await DB.get_data("select nextbridge_percent from pub_prix");
    res.send({prix:prix[0].nextbridge_percent})
  } catch (error) {
    serverError(error,res);
  }
})

router.patch("/nextbridge-percent",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
  try {
    let prix = req.body.prix;
    await DB.update_data("update pub_prix set nextbridge_percent=:prix",{prix});
    res.send({prix});
  } catch (error) {
    serverError(error,res);
  }
})


// List agent
router.get("/avis-agent/:agent_id", [Security.authenticateToken], async (req, res) => {
  try {
    const agent_id = Number(req.params.agent_id);

    const rows = await DB.get_data(
      `
      SELECT
        *
      FROM avis_agent
      WHERE user_id = :agent_id
      ORDER BY created_at DESC limit 50
      `,
      { agent_id },
    );

    for (let i = 0; i <= rows.length - 1; i++) {
      const user = await User_Controller.get_basic_info(rows[i].voter_id);
      rows[i].user = user;
    }

    res.status(200).json(rows);
  } catch (error) {
    serverError(error, res);
  }
});

module.exports = router;

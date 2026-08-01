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
const { MissionService } = require("../controllers/mission_service.js");

router.post("/mission", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let { budget, images, description, service_id } = req.body;

    //compute prix total to debit
    budget = parseInt(budget);
    let prix = await DB.get_data("select * from pub_prix");
    let percent = parseInt(prix[0].nextbridge_percent);
    let debit = budget + (budget * percent) / 100;

    //check if user has enough balance
    let soldes = await DB.get_data(
      "select solde from user where user_id=:user_id",
      { user_id },
    );
    let solde = soldes[0].solde;
    if (debit > solde) {
      return res.sendStatus(401);
    }

    let data = await DB.post_data(
      "insert into mission(budget,images,user_id,description,service_id) values(:budget,:images,:user_id,:description,:service_id)",
      {
        budget,
        images,
        user_id,
        description,
        service_id,
      },
    );

    await DB.update_data(
      "update user set solde = solde - :debit where user_id=:user_id",
      { debit, user_id },
    );
    res.send({ id: data[0] });
  } catch (error) {
    serverError(error, res);
  }
});

router.patch("/mission/:id", Security.authenticateToken, async (req, res) => {
  try {
    let id = parseInt(req.params.id);

    //Check if the mission is already accepted
    let data = await DB.get_data(
      "select * from mission_agent where mission_id=:id and accepted=1",
      { id },
    );
    if (data.length > 0) return res.sendStatus(401);

    let user_id = req.body.user_data.user_id;
    let { images, description, service_id } = req.body;
    await DB.update_data(
      "update mission set images=:images,description=:description,service_id=:service_id  where id=:id and user_id=:user_id",
      { images, description, service_id, id, user_id },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

router.get(
  "/agent-disponible/mission/:mission_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let id = parseInt(req.params.mission_id);
      let missions = await DB.get_data("select * from mission where id=:id", {
        id,
      });
      if (missions.length == 0) return req.sendStatus(404);
      let mission = missions[0];
      let service_id = mission.service_id;
      let agents = await DB.get_data(
        "select * from agent_service where service_id=:service_id",
        { service_id },
      );
      let service = await DB.get_data(
        "select * from agent_type_service where id=:service_id",
        { service_id },
      );
      for (let i = 0; i <= agents.length - 1; i++) {
        agents[i].user_info = await User_Controller.get_basic_info(
          agents[i].user_id,
        );

        let agent_id = agents[i].user_info.user_id;
        //get total notation
        agents[i].notations = await DB.get_data(
          "select * from avis_agent where user_id=:agent_id",
          { agent_id },
        );
        //compute star to display
        let star = 0;
        let starFull =[];
        let starOpen = [];
        for (const item of agents[i].notations) {
          star += item.star;
        }
        star = parseInt(`${star / agents[i].notations.length}`);
        for (let i = 0; i <= star - 1; i++) {
          starFull.push(0);
        }
        for (let i = 0; i <= 5 - star - 1; i++) {
          starOpen.push(0);
        }
         agents[i].starFull = starFull;
         agents[i].starOpen = starOpen;

        // get total missions completed
        let totalMissionsCompleted = await DB.get_data(
          "select * from mission_complete where agent_id=:agent_id",
          { agent_id },
        );
        //check is the mission is assigned to the agent
        let user_id = agents[i].user_id;
        let mission_id = id;
        let data = await DB.get_data(
          "select * from mission_agent where mission_id=:mission_id and user_id=:user_id",
          {
            mission_id,
            user_id,
          },
        );
        agents[i].total_mission = totalMissionsCompleted.length;
        agents[i].assigned = data.length > 0;
      }
      mission.service = service[0];
      creator_info = await User_Controller.get_basic_info(mission.user_id);
      mission.user_info = creator_info;
      res.send({ agents: agents, mission: mission, service: service[0] });
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get(
  "/besoin-nextbridge",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let missions = await DB.get_data(
        "select * from mission where user_id=:user_id order by id DESC",
        { user_id },
      );
      for (let i = 0; i <= missions.length - 1; i++) {
        missions[i].images = JSON.parse(missions[i].images);
        //Select agent that accepted the mission
        let mission_id = missions[i].id;
        let agents = await DB.get_data(
          "select * from mission_agent where mission_id=:mission_id and accepted=1",
          { mission_id },
        );
        if (agents.length > 0) {
          let agent_id = agents[0].user_id;
          missions[i].agent = await User_Controller.get_basic_info(agent_id);
        }
        //Select all the agents contacted
        let agents_accepted = await DB.get_data(
          "select * from mission_agent where mission_id=:mission_id",
          { mission_id },
        );

        // details about the service
        let service_id = missions[i].service_id;
        let services = await DB.get_data(
          "select * from agent_type_service where id=:service_id",
          { service_id },
        );
        missions[i].service = services[0];

        missions[i].total_agent_contacted = agents_accepted.length;

        //check if the mission is completed
        let missionsCompleted = await DB.get_data(
          "select * from mission_complete where mission_id=:mission_id",
          { mission_id },
        );
        missions[i].completed = missionsCompleted.length > 0;
        if (missions[i].completed) {
          //get Notation
          let notations = await DB.get_data(
            "select * from avis_agent where mission_id=:mission_id",
            { mission_id },
          );
          let voter_info = await User_Controller.get_basic_info(
            notations[0].voter_id,
          );
          notations[0].voter_info = voter_info;
          missions[i].notation = notations[0];
        }
      }
      res.send(missions);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get(
  "/mission-termine-details/:id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let id = parseInt(req.params.id);
      let user_id = req.body.user_data.user_id;
      let missions = await DB.get_data(
        "select * from mission where id=:id and user_id=:user_id order by id DESC",
        { id, user_id },
      );
      for (let i = 0; i <= missions.length - 1; i++) {
        missions[i].images = JSON.parse(missions[i].images);
        //Select agent that accepted the mission
        let mission_id = missions[i].id;
        let agents = await DB.get_data(
          "select * from mission_agent where mission_id=:mission_id and accepted=1",
          { mission_id },
        );
        if (agents.length > 0) {
          let agent_id = agents[0].user_id;
          missions[i].agent = await User_Controller.get_basic_info(agent_id);
        }
        //Select all the agents contacted
        let agents_accepted = await DB.get_data(
          "select * from mission_agent where mission_id=:mission_id",
          { mission_id },
        );

        // details about the service
        let service_id = missions[i].service_id;
        let services = await DB.get_data(
          "select * from agent_type_service where id=:service_id",
          { service_id },
        );
        missions[i].service = services[0];

        missions[i].total_agent_contacted = agents_accepted.length;
        let owner_data = await User_Controller.get_basic_info(user_id);
        missions[i].user_info = owner_data;
      }
      res.send(missions);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get("/mission/:id", Security.authenticateToken, async (req, res) => {
  try {
    let id = parseInt(req.params.id);
    let data = await DB.get_data("select * from mission where id=:id", { id });
    let service_id = data[0].service_id;
    let service = await DB.get_data(
      "select * from agent_type_service where id=:service_id",
      { service_id },
    );
    data[0].service = service[0];
    res.send(data[0]);
  } catch (error) {
    serverError(error, res);
  }
});

router.delete("/mission/:id", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let id = parseInt(req.params.id);

    //Check if the mission is already accepted
    let data = await DB.get_data(
      "select * from mission_agent where mission_id=:id and accepted=1",
      { id },
    );
    if (data.length > 0) return res.sendStatus(401);

    //delete all pending request
    await DB.delete_data("delete from mission_agent where mission_id=:id ", {
      id,
    });

    //pay user back
    let mission = await DB.get_data("select * from mission where id=:id", {
      id,
    });
    let budget = mission[0].budget;
    let prix = await DB.get_data("select * from pub_prix");
    let percent = prix[0].nextbridge_percent;
    let debit = budget + (budget * percent) / 100;
    await DB.update_data(
      "update user set solde=solde + :debit where user_id=:user_id",
      { debit, user_id },
    );

    let missions = await DB.get_data(
      "select images from mission where id=:id and user_id=:user_id",
      { id, user_id },
    );
    let images = JSON.parse(missions[0].images);
    for (const item of images) {
      HelperFile.deleteFileFromServer(item);
    }
    await DB.delete_data(
      "delete from mission where id=:id and user_id=:user_id",
      { id, user_id },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

router.post("/assign-mission", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let mission_id = req.body.mission_id;
    let agent_id = req.body.agent_id;
    //check if agent has already rejected the mission
    let mission_rejected = await DB.get_data(
      "select * from  mission_rejected where mission_id=:mission_id and user_id=:user_id",
      { mission_id, user_id },
    );
    if (mission_rejected.length > 0) return res.sendStatus(401);

    //checking if the user is the owner of the mission
    let data = await DB.get_data(
      "select * from mission where user_id=:user_id and id=:mission_id",
      { user_id, mission_id },
    );
    if (data.length == 0) return res.sendStatus(401);
    //check if the mission is already assigned to the agent
    data = await DB.get_data(
      "select * from mission_agent where user_id=:agent_id and mission_id=:mission_id",
      {
        agent_id,
        mission_id,
      },
    );
    if (data.length > 0) {
      return res.sendStatus(200);
    }
    await DB.post_data(
      "insert into mission_agent(user_id,mission_id) values(:agent_id,:mission_id)",
      { agent_id, mission_id },
    );
    //Notify agent
    let missions = await DB.get_data(
      "select * from mission where id=:mission_id",
      { mission_id },
    );
    let service_id = missions[0].service_id;
    let services = await DB.get_data(
      "select * from agent_type_service where id=:service_id",
      { service_id },
    );
    let service = services[0].titre;
    let user_data = await User_Controller.get_basic_info(agent_id);
    let message = `Cher ${user_data.user_full_name}, Une mission << ${service} >> vous a ete assigne, veuillez vous connecter pour valider la mission!`;
    Notification_Controller.new_notif(agent_id, message);
    EmailService.send_email(
      user_data.user_email,
      "Nouvelle mission a valider",
      message,
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

router.post(
  "/revoquer-mission",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let mission_id = req.body.mission_id;
      let agent_id = req.body.agent_id;
      //checking if the user is the owner of the mission
      let data = await DB.get_data(
        "select * from mission where user_id=:user_id and id=:mission_id",
        { user_id, mission_id },
      );
      if (data.length == 0) return res.sendStatus(401);

      await DB.post_data(
        "delete from  mission_agent where user_id=:agent_id and mission_id=:mission_id",
        { agent_id, mission_id },
      );

      //Notify agent
      let mission = await MissionService.get(mission_id);
      let user_data = await User_Controller.get_basic_info(agent_id);
      let message = `Cher ${user_data.user_full_name}, Une  mission << ${mission.service.titre} >> vous a ete revoque!`;
      Notification_Controller.new_notif(agent_id, message);
      EmailService.send_email(user_data.user_email, "Mission revoque", message);

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/accept-mission/:mission_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let mission_id = parseInt(req.params.mission_id);
      let data = await DB.get_data(
        "select * from mission_agent where mission_id=:mission_id and user_id=:user_id and accepted=0",
        {
          mission_id,
          user_id,
        },
      );
      if (data.length == 0) return res.sendStatus(401);
      await DB.update_data(
        "update mission_agent set accepted=1 where mission_id=:mission_id and user_id=:user_id",
        { mission_id, user_id },
      );
      //Notify the owner of the mission
      let mission = await MissionService.get(mission_id);
      let owner_id = mission.user_id;
      let owner_data = await User_Controller.get_basic_info(owner_id);
      let user_data = await User_Controller.get_basic_info(user_id);
      let message = `Votre mission ${mission.service.titre} a ete valide par l'agent ${user_data.user_full_name}! Connecter vous pour suivre son evolution!`;
      Notification_Controller.new_notif(owner_id, message);
      EmailService.send_email(
        owner_data.user_email,
        "Votre mission a ete accepte",
        message,
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/reject-mission/:mission_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let mission_id = parseInt(req.params.mission_id);

      //notify mission owner
      let mission = await MissionService.get(mission_id);
      let owner_data = await User_Controller.get_user_data(mission.user_id);
      let agent_data = await User_Controller.get_user_data(user_id);
      let message = `Votre mission <<${mission.service.titre}>> a ete refuse par l'agent ${agent_data.user_full_name}!`;
      Notification_Controller.new_notif(owner_data.user_id, message);
      EmailService.send_email(
        owner_data.user_email,
        "Mission revoque",
        message,
      );

      //keep rejected state
      await DB.post_data(
        "insert into mission_rejected(mission_id,user_id) values(:mission_id,:user_id)",
        { mission_id, user_id },
      );

      await DB.delete_data(
        "delete from mission_agent where mission_id=:mission_id and user_id=:user_id",
        {
          mission_id,
          user_id,
        },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// Selection des missions en attente de validation
router.get("/mission-attente", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let mission_ids = await DB.get_data(
      "select * from mission_agent where user_id=:user_id and accepted=0",
      { user_id },
    );
    let missions = [];
    for (let i = 0; i <= mission_ids.length - 1; i++) {
      let mission_id = mission_ids[i].mission_id;
      let missions_data = await DB.get_data(
        "select * from mission where id=:mission_id",
        { mission_id },
      );
      if (missions_data.length > 0) {
        //get details about the owner of the mission
        let mission_item_data = missions_data[0];
        mission_item_data.user_info = await User_Controller.get_basic_info(
          mission_item_data.user_id,
        );
        // details about the service
        let service_id = missions_data[0].service_id;
        let services = await DB.get_data(
          "select * from agent_type_service where id=:service_id",
          { service_id },
        );
        mission_item_data.service = services[0];
        mission_item_data.images = JSON.parse(mission_item_data.images);
        missions.push(mission_item_data);
      }
    }
    res.send(missions);
  } catch (error) {
    serverError(error, res);
  }
});

//Terminate mission
router.post(
  "/terminate-mission/:mission_id/agent/:agent_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let { star, avis } = req.body;
      if (parseInt(star) == 0) {
        return res
          .status(400)
          .send("Veuillez selectionner au moins une etoile!");
      }
      let mission_id = parseInt(req.params.mission_id);

      //check if mission is already completed
      let missionCompleted = await DB.get_data(
        "select * from mission_complete where mission_id=:mission_id",
        { mission_id },
      );
      if (missionCompleted.length > 0) return res.sendStatus(200);
      let agent_id = parseInt(req.params.agent_id);
      let user_id = req.body.user_data.user_id;
      let missions = await DB.get_data(
        "select * from mission where id=:mission_id and user_id=:user_id",
        { mission_id, user_id },
      );
      if (missions.length == 0)
        return res
          .status(401)
          .send("Vous n'etes pas proprietaire de cette mission!");
      //get associated agent
      let budget = missions[0].budget;
      let agents = await DB.get_data(
        "select * from mission_agent where mission_id=:mission_id and user_id=:agent_id and accepted=1",
        { mission_id, agent_id },
      );
      if (agents.length == 0)
        return res.status(401).send("L'agent n'a pas accepte cette mission!");
      //save mission as completed
      await DB.post_data(
        "insert into mission_complete(agent_id,mission_id) values(:agent_id,:mission_id)",
        { agent_id, mission_id },
      );
      //save avis owner ot the mission
      await DB.post_data(
        "insert into avis_agent(mission_id,star,avis,user_id,voter_id) values(:mission_id,:star,:avis,:agent_id,:user_id)",
        {
          mission_id,
          star,
          avis,
          agent_id,
          user_id,
        },
      );
      //give money to agent
      await DB.update_data(
        "update user set solde = solde + :budget where user_id=:agent_id",
        { budget, agent_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

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

router.post("/emplois", Security.authenticateToken, async (req, res) => {
  try {
    let created_at = new Date();
    let user_id = req.body.user_data.user_id;
    let {
      lieu,
      structure_id,
      titre,
      description,
      skills,
      teletravail,
      country_id,
      region_id,
      ville_id,
      salary_min,
      salary_max,
      niveau_etude,
      date_limite,
      type_contrat,
    } = req.body;

    await DB.post_data(
      "insert into emplois(lieu,user_id,created_at,structure_id,titre,description,skills,teletravail,country_id,region_id,ville_id,salary_min,salary_max,niveau_etude,date_limite,type_contrat) values(:lieu,:user_id,:created_at,:structure_id,:titre,:description,:skills,:teletravail,:country_id,:region_id,:ville_id,:salary_min,:salary_max,:niveau_etude,:date_limite,:type_contrat)",
      {
        lieu,
        created_at,
        user_id,
        structure_id,
        titre,
        description,
        skills,
        teletravail,
        country_id,
        region_id,
        ville_id,
        salary_min,
        salary_max,
        niveau_etude,
        date_limite,
        type_contrat,
      },
    );

    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

//Search for a job everywhere
router.post("/search-job", Security.authenticateToken, async (req, res) => {
  try {
    let search_token = req.body.search_token;
    let jobs = await DB.get_data(
      `select * from emplois where titre like '%${search_token}%' or description like '%${search_token}%'`,
      {},
    );
    jobs = await JobController.getJobsDetails(jobs);
    res.send(jobs);
  } catch (error) {
    serverError(error, res);
  }
});

router.patch("/emplois/:id", Security.authenticateToken, async (req, res) => {
  try {
    let id = parseInt(req.params.id);
    let user_id = req.body.user_data.user_id;
    let {
      lieu,
      structure_id,
      titre,
      description,
      skills,
      teletravail,
      country_id,
      region_id,
      ville_id,
      salary_min,
      salary_max,
      niveau_etude,
      date_limite,
      type_contrat,
    } = req.body;

    await DB.update_data(
      "update emplois set expired=0,lieu=:lieu,structure_id=:structure_id,titre=:titre,description=:description,skills=:skills,teletravail=:teletravail,country_id=:country_id,region_id=:region_id,ville_id=:ville_id,salary_min=:salary_min,salary_max=:salary_max,niveau_etude=:niveau_etude,date_limite=:date_limite ,type_contrat=:type_contrat where id=:id and user_id=:user_id",
      {
        lieu,
        structure_id,
        titre,
        description,
        skills,
        teletravail,
        country_id,
        region_id,
        ville_id,
        salary_min,
        salary_max,
        niveau_etude,
        date_limite,
        type_contrat,
        id,
        user_id,
      },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

router.get(
  "/emplois/:structure_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let structure_id = parseInt(req.params.structure_id);
      let data = await DB.get_data(
        "select * from emplois where structure_id=:structure_id",
        { structure_id },
      );
      res.send(data);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get(
  "/single-emplois/:id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let id = parseInt(req.params.id);
      let data = await DB.get_data("select * from emplois where id=:id", {
        id,
      });
      res.send(data[0]);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.delete("/emplois/:id", Security.authenticateToken, async (req, res) => {
  try {
    let id = parseInt(req.params.id);
    let user_id = req.body.user_data.user_id;
    await DB.delete_data(
      "delete from emplois where id=:id and user_id=:user_id",
      { id, user_id },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

//get jobs of the regions
router.get(
  "/jobs/offset/:offset/region/:region_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let region_id = parseInt(req.params.region_id);
      let limit = 30;
      let offset = parseInt(req.params.offset);
      let jobs = await DB.get_data(
        "select * from emplois where region_id=:region_id and expired = 0 limit :limit offset :offset",
        { region_id, limit, offset },
      );
      jobs = await JobController.getJobsDetails(jobs);
      res.send(jobs);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//total job regions
router.get(
  "/total-jobs/region/:region_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let region_id = parseInt(req.params.region_id);

      let total = await DB.get_data(
        "select count(*) as total from emplois where region_id=:region_id and expired = 0",
        { region_id },
      );

      res.send(total);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//get Single job
router.get("/single-job/:id", Security.authenticateToken, async (req, res) => {
  try {
    let id = parseInt(req.params.id);
    let jobs = await DB.get_data(
      "select * from emplois where id=:id and expired = 0",
      { id },
    );
    jobs = await JobController.getJobsDetails(jobs);
    res.send(jobs);
  } catch (error) {
    serverError(error, res);
  }
});

//postuler
router.post("/postuler", Security.authenticateToken, async (req, res) => {
  try {
    let job_id = req.body.job_id;
    let user_id = req.body.user_data.user_id;

    let existed = await DB.get_data(
      "select * from candidats where job_id=:job_id and user_id=:user_id ",
      { job_id, user_id },
    );
    if (existed.length > 0) {
      return res.sendStatus(200);
    } else {
      await DB.post_data(
        "insert into candidats(job_id,user_id) values(:job_id,:user_id)",
        { job_id, user_id },
      );
      res.sendStatus(200);
    }
  } catch (error) {
    serverError(error, res);
  }
});

//recuperer les candidats
router.get(
  "/candidats/:job_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let job_id = parseInt(req.params.job_id);
      let candidats = await DB.get_data(
        "select * from candidats where job_id=:job_id",
        { job_id },
      );
      for (let i = 0; i <= candidats.length - 1; i++) {
        candidats[i].user = await User_Controller.get_basic_info(
          candidats[i].user_id,
        );
      }
      res.send(candidats);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//valider un candidats
router.patch(
  "/validate-candidat/:user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let job_id = req.body.job_id;
      let job_name = req.body.job_name;
      let structure_name = req.body.structure_name;
      let user_id = parseInt(req.params.user_id);
      let owner_id = req.body.user_data.user_id;
      //make sure the validator is the owner of the job
      let data = await DB.get_data(
        "select * from emplois where id=:job_id and user_id=:owner_id",
        {
          job_id,
          owner_id,
        },
      );
      if (data.length == 0) return req.sendStatus(403);
      await DB.update_data(
        "update candidats set accepted = 1 where job_id=:job_id and user_id=:user_id",
        { job_id, user_id },
      );
      Notification_Controller.new_notif(
        user_id,
        `Votre candidature pour le poste de ${job_name} au sein de la structure ${structure_name} a ete accepte! , les responsables de la structure vont vous contacter bientot.`,
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//recuperer mes candidatures
router.get("/user-candidatures",Security.authenticateToken,async(req,res)=>{
  try {
    let user_id = req.body.user_data.user_id;
    let data = await DB.get_data("select * from candidats where user_id=:user_id",{user_id});
    for(let i = 0 ; i<=data.length-1;i++){
      data[i].job = await JobController.getSingleJobDetails(data[i].job_id);
    }
    res.send(data);
  } catch (error) {
    serverError(error,res);
  }
})

module.exports = router;

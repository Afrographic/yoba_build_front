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

router.post("/pub", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let all_country = 0;
    let is_admin = await User_Controller.is_admin(user_id);
    if (is_admin) {
      all_country = req.body.all_country;
    }

    let country_id = req.body.country_id;
    let days = req.body.days;
    let link = req.body.link;
    let prix = req.body.prix;
    let banner = req.body.banner;
    let created_at = new Date();
    let expired_at = HelperFunction.add_days_to_current_date(days);
    if (req.files == undefined) return res.sendStatus(400);
    if (days <= 0) return res.sendStatus(400);
    //Upload image
    let file = req.files.file;
    let url = "";
    if (file != undefined) {
      let uid = HelperFunction.generate_unique_id_from_time();
      file.mv(
        `./public/backend_files/pub_${uid}${HelperFunction.replace_space_with_underscore(file.name)}`,
      );
      url = `${Consts.backend_host}/backend_files/pub_${uid}${HelperFunction.replace_space_with_underscore(file.name)}`;
    }

    //upload video
    let video = req.files.video;
    let video_url = "";
    if (video != undefined) {
      let uid = HelperFunction.generate_unique_id_from_time();
      video.mv(
        `./public/backend_files/pub_${uid}${HelperFunction.replace_space_with_underscore(video.name)}`,
      );
      video_url = `${Consts.backend_host}/backend_files/pub_${uid}${HelperFunction.replace_space_with_underscore(video.name)}`;
    }

    //Diminuer le solde de l'utilisateur
    await DB.update_data(
      "update user set solde = solde - :prix where user_id=:user_id",
      { prix, user_id },
    );
    await DB.post_data(
      "insert into pub(video_url,all_country,country_id,url,user_id,created_at,expired_at,link,banner,days) values(:video_url,:all_country,:country_id,:url,:user_id,:created_at,:expired_at,:link,:banner,:days)",
      {
        video_url,
        all_country,
        country_id,
        url,
        user_id,
        created_at,
        expired_at,
        link,
        banner,
        days,
      },
    );

    //Give the money to the affiliate
    let amount = (20 / 100) * prix;
    await User_Controller.give_money_influencer_for_affiliation(
      user_id,
      amount,
    );

    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

//Admin edit pub prix
router.patch(
  "/pub_prix",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let full_screen_prix_jour = req.body.full_screen_prix_jour;
      let banner_prix_jour = req.body.banner_prix_jour;
      await DB.update_data(
        "update pub_prix set full_screen_prix_jour = :full_screen_prix_jour,banner_prix_jour=:banner_prix_jour",
        { full_screen_prix_jour, banner_prix_jour },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get("/pub_prix", Security.authenticateToken, async (req, res) => {
  try {
    let prices = await DB.get_data("select * from pub_prix");
    res.send(prices[0]);
  } catch (error) {
    serverError(error, res);
  }
});

router.get("/pub/:country_id", Security.authenticateToken, async (req, res) => {
  try {
    let country_id = parseInt(req.params.country_id);
    let pubs = await DB.get_data(
      "select * from pub where country_id=:country_id or all_country = 1 order by pub_id DESC",
      { country_id },
    );
    res.send(pubs);
  } catch (error) {
    serverError(error, res);
  }
});

//Get user pub
router.get("/pub", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let pubs = await DB.get_data(
      "select * from pub where user_id=:user_id order by pub_id DESC",
      {
        user_id,
      },
    );
    res.send(pubs);
  } catch (error) {
    serverError(error, res);
  }
});

//Get all  pub
router.get(
  "/admin-pub",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let pubs = await DB.get_data("select * from pub");
      res.send(pubs);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.delete(
  "/admin-pub/:pub_id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let pub_id = parseInt(req.params.pub_id);
      await DB.delete_data("delete from pub where pub_id=:pub_id", { pub_id });
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.delete("/pub/:pub_id", Security.authenticateToken, async (req, res) => {
  try {
    let pub_id = parseInt(req.params.pub_id);
    let user_id = req.body.user_data.user_id;
    await DB.delete_data(
      "delete from pub where pub_id=:pub_id and user_id=:user_id",
      { pub_id, user_id },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

module.exports = router;

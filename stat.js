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

router.get(
  "/pays_region_ville_user_stat",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      // Nombre d'utilisateurs par pays
      let pays = await DB.get_data("select * from country");
      for (let i = 0; i <= pays.length - 1; i++) {
        let country_id = pays[i].country_id;
        let total = await DB.get_data(
          "select count(*) as total from user where pays_id=:country_id",
          { country_id },
        );
        pays[i].total_user = total[0].total;
        //Nombre de user par regions
        let regions = await DB.get_data(
          "select * from region where country_id=:country_id",
          { country_id },
        );
        for (let j = 0; j <= regions.length - 1; j++) {
          let region_id = regions[j].region_id;
          let total = await DB.get_data(
            "select count(*) as total from user where region_id=:region_id",
            { region_id },
          );
          regions[j].total_user = total[0].total;
          //Nombre d'utilisateur par ville
          let villes = await DB.get_data(
            "select * from city where region_id=:region_id",
            { region_id },
          );
          for (let k = 0; k <= villes.length - 1; k++) {
            let city_id = villes[k].city_id;
            let total = await DB.get_data(
              "select count(*) as total from user where ville_id=:city_id",
              { city_id },
            );
            villes[k].total_user = total[0].total;
          }
          regions[j].villes = villes;
        }
        pays[i].regions = regions;
      }
      res.send(pays);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get(
  "/pays_region_ville_offre_stat",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      // Nombre d'utilisateurs par pays
      let pays = await DB.get_data("select * from country");
      for (let i = 0; i <= pays.length - 1; i++) {
        let country_id = pays[i].country_id;
        let total = await DB.get_data(
          "select count(*) as total from offre where country_id=:country_id",
          { country_id },
        );
        pays[i].total_offre = total[0].total;
        //Nombre de offre par regions
        let regions = await DB.get_data(
          "select * from region where country_id=:country_id",
          { country_id },
        );
        for (let j = 0; j <= regions.length - 1; j++) {
          let region_id = regions[j].region_id;
          let total = await DB.get_data(
            "select count(*) as total from offre where region_id=:region_id",
            { region_id },
          );
          regions[j].total_offre = total[0].total;
          //Nombre d'utilisateur par ville
          let villes = await DB.get_data(
            "select * from city where region_id=:region_id",
            { region_id },
          );
          for (let k = 0; k <= villes.length - 1; k++) {
            let city_id = villes[k].city_id;
            let total = await DB.get_data(
              "select count(*) as total from offre where city_id=:city_id",
              { city_id },
            );
            villes[k].total_offre = total[0].total;
          }
          regions[j].villes = villes;
        }
        pays[i].regions = regions;
      }
      res.send(pays);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get(
  "/stat_jour_mois_annee",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      //Stat du jour
      let statDuJour = await DB.get_data(
        "select count(*) as total from offre where DATE(created_at)=CURDATE()",
      );

      //Stat de la semaine
      let statDeLaSemaine = await DB.get_data(
        "SELECT count(*) as total FROM offre WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AND created_at < DATE_ADD( DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY )",
      );
      //Stat du mois
      let statDuMois = await DB.get_data(
        "SELECT count(*) as total FROM offre WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01') + INTERVAL 1 MONTH",
      );

      res.send({
        statDuJour: statDuJour,
        statDeLaSemaine: statDeLaSemaine,
        statDuMois: statDuMois,
      });
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Stats par categorie
router.get(
  "/offre_categorie_stat",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let cats = await DB.get_data(
        "select * from categorie_sous order by categorie_sous_name ASC",
      );
      for (let i = 0; i <= cats.length - 1; i++) {
        let categorie_sous_id = cats[i].categorie_sous_id;
        let total = await DB.get_data(
          "select count(*) as total from offre where categorie_sous_id=:categorie_sous_id",
          { categorie_sous_id },
        );
        cats[i].total = total[0].total;
      }
      res.send(cats);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Dynamique de publications
router.get(
  "/dynamque_publication",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let villes = await DB.get_data("select * from city");
      for (let i = 0; i <= villes.length - 1; i++) {
        let city_id = villes[i].city_id;
        //Compute les offres du mois actuel
        let totalCeMois = await DB.get_data(
          "SELECT count(*) as total FROM offre WHERE city_id=:city_id and created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01') + INTERVAL 1 MONTH",
          { city_id },
        );
        villes[i].totalCeMois = totalCeMois[0].total;
        //Compute les offres du mois passe
        let totalMoisPasse = await DB.get_data(
          "SELECT count(*) as total FROM offre WHERE city_id=:city_id and  YEAR(created_at) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) AND MONTH(created_at) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH);",
          { city_id },
        );
        villes[i].totalMoisPasse = totalMoisPasse[0].total;
        villes[i].taux = parseInt((( villes[i].totalCeMois -  villes[i].totalMoisPasse) / villes[i].totalMoisPasse) * 100)
      }
      res.send(villes);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

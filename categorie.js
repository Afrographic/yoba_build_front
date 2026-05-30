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
const { Offre_Controller } = require("../controllers/offre_controller.js");

router.get("/categories", async (req, res) => {
  try {
    let cats = await DB.get_data("select * from categorie");
    for (let i = 0; i <= cats.length - 1; i++) {
      let categorie_id = cats[i].categorie_id;
      let sub_cats = await DB.get_data(
        "select * from categorie_sous where categorie_id=:categorie_id",
        { categorie_id },
      );
      cats[i].sub_cats = sub_cats;
    }
    res.send(cats);
  } catch (error) {
    serverError(error, res);
  }
});

router.get(
  "/sous_cats/:categorie_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let categorie_id = parseInt(req.params.categorie_id);
      let cats = await DB.get_data(
        "select * from categorie_sous where categorie_id = :categorie_id",
        { categorie_id },
      );
      res.send(cats);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.post(
  "/sous_categorie",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let categorie_sous_name = HelperFunction.Ucase(
        req.body.categorie_sous_name,
      );
      let categorie_id = req.body.categorie_id;
      if (categorie_sous_name.trim().length == 0) return res.sendStatus(400);
      let sous_categorie = await DB.post_data(
        "insert into categorie_sous(categorie_sous_name,categorie_id) values(:categorie_sous_name,:categorie_id)",
        { categorie_sous_name, categorie_id },
      );
      res.send({ categorie_sous_id: sous_categorie[0] });
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.delete(
  "/categorie_sous/:categorie_sous_id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let categorie_sous_id = parseInt(req.params.categorie_sous_id);
      await DB.delete_data(
        "delete from categorie_sous where categorie_sous_id=:categorie_sous_id",
        { categorie_sous_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/categorie_sous/:categorie_sous_id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let categorie_sous_id = parseInt(req.params.categorie_sous_id);
      let categorie_sous_name = HelperFunction.Ucase(
        req.body.categorie_sous_name,
      );
      if (categorie_sous_name.trim().length == 0) return res.sendStatus(400);
      await DB.update_data(
        "update categorie_sous set categorie_sous_name=:categorie_sous_name where categorie_sous_id=:categorie_sous_id",
        { categorie_sous_name, categorie_sous_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get Offres per categorie
router.get(
  "/offre_cat/:offset/:categorie_sous_id/region/:region_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let offset = parseInt(req.params.offset);
      let region_id = parseInt(req.params.region_id);
      let categorie_sous_id = parseInt(req.params.categorie_sous_id);
      let limit = 30;

      let offres = await DB.get_data(
        "select * from offre where categorie_sous_id=:categorie_sous_id and region_id=:region_id  order by  offre_id DESC limit :limit offset :offset",
        { region_id, categorie_sous_id, offset, limit },
      );

     offres = await Offre_Controller.getOffreMetadatas(user_id,offres);

      res.send(offres);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get total offre per categorie
router.get(
  "/total_offre_cat/:categorie_sous_id/region/:region_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let categorie_sous_id = parseInt(req.params.categorie_sous_id);
      let region_id = parseInt(req.params.region_id);

      let total = await DB.get_data(
        "select count(*) as total from offre where categorie_sous_id=:categorie_sous_id and region_id=:region_id  ",
        { categorie_sous_id,region_id },
      );

      res.send({ total: total[0].total });
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

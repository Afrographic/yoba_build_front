const express = require("express");
const router = express.Router();

const { Security } = require("../utils/security");
const { Validator } = require("../utils/validator");
const { HelperFunction } = require("../utils/helper_function");
const { HelperFile } = require("../utils/helper_file.js");
const { OwnerShipChecker } = require("../utils/ownership_checker.js");
const { Consts } = require("../consts.js");
const { Thoth_DB } = require("../thoth_db");
const { serverError } = require("../utils/server_error.js");
const { EmailService } = require("../utils/email_service");

router.post("/compte_depot", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    //check if an account already exist
    let accounts = await Thoth_DB.get_data(
      "select * from user_compte_depot where user_id=:user_id",
      { user_id },
    );
    if (accounts.length > 0) return res.sendStatus(200);

    let { numero, nom, operateur } = req.body;
    if (numero.trim().length == 0)
      return res.status(400).send("Le numero ne peut pas etre vide!");
    if (nom.trim().length == 0)
      return res.status(400).send("Le nom ne peut pas etre vide!");
    if (operateur.trim().length == 0)
      return res.status(400).send("L'operateur ne peut pas etre vide!");
    await Thoth_DB.post_data(
      "insert into user_compte_depot(numero,nom,operateur,user_id) values(:numero,:nom,:operateur,:user_id)",
      { numero, nom, operateur, user_id },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

router.patch(
  "/compte_depot/:id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let id = parseInt(req.params.id);
      let user_id = req.body.user_data.user_id;
      let { numero, nom, operateur } = req.body;
      if (numero.trim().length == 0)
        return res.status(400).send("Le numero ne peut pas etre vide!");
      if (nom.trim().length == 0)
        return res.status(400).send("Le nom ne peut pas etre vide!");
      if (operateur.trim().length == 0)
        return res.status(400).send("L'operateur ne peut pas etre vide!");
      await Thoth_DB.update_data(
        "update user_compte_depot set numero=:numero,nom=:nom,operateur=:operateur where id=:id and user_id=:user_id",
        { numero, nom, operateur, id, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get(
  "/compte_depot/:user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = parseInt(req.params.user_id);
      let comptes = await Thoth_DB.get_data(
        "select * from user_compte_depot where user_id=:user_id",
        { user_id },
      );
      if (comptes.length == 0) return res.sendStatus(404);
      res.send({ compte: comptes[0] });
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

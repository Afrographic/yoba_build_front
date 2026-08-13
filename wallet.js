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
const Axios = require("../utils/axios");
const Axios_Private = require("../utils/axios");
const { Model_Helper } = require("../utils/model_helper.js");
const { User_Controller } = require("../controllers/user_controller.js");
const { EmailService } = require("../utils/email_service.js");
const { NotifEngine } = require("../services/NotifEngine.js");

router.get("/lidav-accounts", Security.authenticateToken, async (req, res) => {
  try {
    let accounts = await Thoth_DB.get_data("select * from compte_thoth");
    res.send(accounts);
  } catch (error) {
    serverError(error, res);
  }
});

router.get("/solde", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let data = await Thoth_DB.get_data(
      "select balance from user where user_id=:user_id",
      { user_id },
    );
    res.send({ solde: data[0].balance });
  } catch (error) {
    serverError(error, res);
  }
});

router.post(
  "/demande-recharge",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let asker_user_id = user_id;
      let amount = req.body.amount;
      let proof = req.body.proof;
      if (parseInt(amount) < 500) {
        return res
          .status(400)
          .send("Le montant de recharge minimum est de 500 F");
      }
      await Thoth_DB.post_data(
        "insert into depots(user_id,amount,proof) values(:user_id,:amount,:proof)",
        { user_id, amount, proof },
      );
      //Notify admin
      let admins = await Thoth_DB.get_data("select * from admin");
      for (let i = 0; i <= admins.length - 1; i++) {
        let user_id = admins[i].user_id;
        let user_data = await User_Controller.get_user_data(asker_user_id);
        let admin_data = await User_Controller.get_user_data(user_id);
        let message = `L'utilisateur ${user_data.user_fullname} souhaite faire une recharge de ${HelperFunction.format_number(amount)} XAF`;
        EmailService.sendEmail(
          admin_data.user_email,
          "Demande de recharge",
          message,
        );
        NotifEngine.new(admin_data.user_id, message);
      }
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Confirmation de recharge
router.get(
  "/confirmation-recharge/:id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let id = parseInt(req.params.id);
      let depots = await Thoth_DB.get_data(
        "select * from depots where id=:id",
        { id },
      );
      if (depots.length == 0) return res.sendStatus(404);
      let user_id = depots[0].user_id;
      let amount = depots[0].amount;

      await Thoth_DB.update_data("update depots set valide = 1 where id=:id", {
        id,
      });
      await Thoth_DB.update_data(
        "update user set balance = balance + :amount where user_id=:user_id",
        { amount, user_id },
      );

      //Notify user
      let user_data = await User_Controller.get_user_data(user_id);
      let message = `Cher ${user_data.user_fullname} , Votre recharge de ${HelperFunction.format_number(amount)} XAF a ete confirme! Merci pour votre confiance!`;
      EmailService.sendEmail(
        user_data.user_email,
        "Recharge confirme",
        message,
      );
      NotifEngine.new(user_data.user_id, message);

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Rejet de la recharge
router.get(
  "/reject-recharge/:id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let id = parseInt(req.params.id);

      let depots = await Thoth_DB.get_data(
        "select * from depots where id=:id",
        { id },
      );
      if (depots.length == 0) return res.sendStatus(404);
      let user_id = depots[0].user_id;
      let amount = depots[0].amount;

      await Thoth_DB.update_data(
        "update depots set rejected = 1 where id=:id",
        {
          id,
        },
      );

      //Notify user
      let user_data = await User_Controller.get_user_data(user_id);
      let message = `Cher ${user_data.user_fullname} , Votre recharge de ${HelperFunction.format_number(amount)} XAF a ete Rejete Pour tentative de Fraude!`;
      EmailService.sendEmail(
        user_data.user_email,
        "Recharge confirme",
        message,
      );
      NotifEngine.new(user_data.user_id, message);

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Recuperer les demandes a recharger
router.get(
  "/demandes-recharges",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let demandes = await Thoth_DB.get_data(
        "select * from depots where valide = 0 and rejected = 0 order by id DESC",
      );
      for (let i = 0; i <= demandes.length - 1; i++) {
        demandes[i].user_data = await User_Controller.get_user_data(
          demandes[i].user_id,
        );
      }
      res.send(demandes);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Recuperer les demandes de retrait
router.get(
  "/demandes-retrait",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let retraits = await Thoth_DB.get_data(
        "select * from retraits where valide = 0 and rejected = 0 order by id DESC",
      );
      for (let i = 0; i <= retraits.length - 1; i++) {
        retraits[i].user = await User_Controller.get_user_data(
          retraits[i].user_id,
        );
        let user_id = retraits[i].user_id;
        let comptes = await Thoth_DB.get_data(
          "select * from user_compte_depot where user_id=:user_id",
          { user_id },
        );
        retraits[i].compte = comptes[0];
      }
      res.send(retraits);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get("/recharges/me", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let demandes = await Thoth_DB.get_data(
      "select * from depots where user_id = :user_id order by id DESC limit 50",
      {
        user_id,
      },
    );
    for (let i = 0; i <= demandes.length - 1; i++) {
      demandes[i].user_data = await User_Controller.get_user_data(
        demandes[i].user_id,
      );
    }
    res.send(demandes);
  } catch (error) {
    serverError(error, res);
  }
});

router.get("/retraits/me", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let retraits = await Thoth_DB.get_data(
      "select * from retraits where user_id = :user_id order by id DESC limit 50",
      {
        user_id,
      },
    );
    for (let i = 0; i <= retraits.length - 1; i++) {
      retraits[i].user = await User_Controller.get_user_data(
        retraits[i].user_id,
      );
      let user_id = retraits[i].user_id;
      let comptes = await Thoth_DB.get_data(
        "select * from user_compte_depot where user_id=:user_id",
        { user_id },
      );
      retraits[i].compte = comptes[0];
    }
    res.send(retraits);
  } catch (error) {
    serverError(error, res);
  }
});

router.get(
  "/history-recharges",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let demandes = await Thoth_DB.get_data(
        "select * from depots order by id DESC limit 50",
      );
      for (let i = 0; i <= demandes.length - 1; i++) {
        demandes[i].user_data = await User_Controller.get_user_data(
          demandes[i].user_id,
        );
      }
      res.send(demandes);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get(
  "/history-retraits",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let retraits = await Thoth_DB.get_data(
        "select * from retraits  order by id DESC limit 50",
      );
      for (let i = 0; i <= retraits.length - 1; i++) {
        retraits[i].user = await User_Controller.get_user_data(
          retraits[i].user_id,
        );
        let user_id = retraits[i].user_id;
        let comptes = await Thoth_DB.get_data(
          "select * from user_compte_depot where user_id=:user_id",
          { user_id },
        );
        retraits[i].compte = comptes[0];
      }
      res.send(retraits);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// Demande de retrait
router.post(
  "/demande-retrait",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      //check if a user has a deposit account
      let comptes = await Thoth_DB.get_data(
        "select * from user_compte_depot where user_id=:user_id",
        { user_id },
      );
      if (comptes.length == 0) return res.sendStatus(400);

      let amount = parseInt(req.body.amount);
      //get user solde
      let user_data = await Thoth_DB.get_data(
        "select balance from user where user_id=:user_id",
        { user_id },
      );
      if (user_data.length == 0)
        return res.status(404).send("Ce compte n'existe pas!");
      let user_solde = user_data[0].balance;
      if (amount > user_solde)
        return res.status(401).send("Votre solde est insuffisant!");
      if (amount < 5000)
        return res
          .status(400)
          .send("Le montant minimum de retrait est de 5 000 XAF");

      //check is another is pending
      let demandesRetraits = await Thoth_DB.get_data(
        "select * from retraits where user_id=:user_id and valide=0 and rejected = 0",
        { user_id },
      );
      if (demandesRetraits.length > 0) {
        return res
          .status(403)
          .send(
            "Vous avez deja une demande en attente, veuillez patientez que cette demande soit traite!",
          );
      }
      await Thoth_DB.post_data(
        "insert into retraits(user_id,amount) values(:user_id,:amount)",
        { user_id, amount },
      );

      //Notify admin
      let admins = await Thoth_DB.get_data("select * from admin");
      for (let i = 0; i <= admins.length - 1; i++) {
        let user_id = admins[i].user_id;
        let user_data = await User_Controller.get_user_data(user_id);
        let message = `L'utilisateur ${user_data.user_fullname} souhaite faire un retrait  de ${HelperFunction.format_number(amount)} XAF`;
        EmailService.sendEmail(
          user_data.user_email,
          "Demande de retrait",
          message,
        );
        NotifEngine.new(user_data.user_id, message);
      }

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//confirmer le retrait
router.get(
  "/confirmer-retrait/:id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let id = parseInt(req.params.id);
      let retraits = await Thoth_DB.get_data(
        "select * from retraits where id=:id",
        { id },
      );
      if (retraits.length == 0) return res.sendStatus(404);
      let amount = retraits[0].amount;
      let user_id = retraits[0].user_id;
      await Thoth_DB.update_data(
        "update retraits set valide = 1 where id=:id and user_id=:user_id",
        { id, user_id },
      );
      await Thoth_DB.update_data(
        "update user set balance = balance - :amount where user_id=:user_id",
        { amount, user_id },
      );

      //Notify user
      let user_data = await User_Controller.get_user_data(user_id);
      let message = `Cher ${user_data.user_fullname} , Votre demande de retrait de ${HelperFunction.format_number(amount)} XAF a ete traite, Vous pouvez consulter votre solde mobile pour confirme!`;
      EmailService.sendEmail(user_data.user_email, "Retrait confirme", message);
      NotifEngine.new(user_data.user_id, message);

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//rejeter le retrait
router.patch(
  "/rejeter-retrait/:id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let id = parseInt(req.params.id);

      let retraits = await Thoth_DB.get_data(
        "select * from retraits where id=:id",
        { id },
      );
      if (retraits.length == 0) return res.sendStatus(404);
      let amount = retraits[0].amount;
      let user_id = retraits[0].user_id;

      await Thoth_DB.update_data(
        "update retraits set valide = 0 where id=:id",
        { id },
      );

      //Notify user
      let user_data = await User_Controller.get_user_data(user_id);
      let message = `Cher ${user_data.user_fullname} , Nous ne pouvons pas traite votre demande de retrait de ${HelperFunction.format_number(amount)} XAF pour le moment, veuillez ressayer ulterieurement!`;
      EmailService.sendEmail(user_data.user_email, "Retrait Rejete", message);
      NotifEngine.new(user_data.user_id, message);

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//retraits a valider
router.get(
  "/retraits-a-valider",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let retraits = await Thoth_DB.get_data(
        "select * from retraits where valide = 0 and rejected = 0",
      );
      for (let i = 0; i <= retraits.length - 1; i++) {
        let user_id = retraits[i].user_id;
        retraits[i].user_data = await User_Controller.get_user_data(user_id);
        let comptes = await Thoth_DB.get_data(
          "select * from user_compte_depot where user_id=:user_id",
          { user_id },
        );
        retraits[i].comptes = comptes;
      }
      res.send(retraits);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

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
const {
  CommuanuteController,
} = require("../controllers/communaute_controller.js");

//List my communities
router.get("/communaute", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let communautes_user = await DB.get_data(
      "select * from communaute_user where user_id=:user_id",
      { user_id },
    );

    let communautes = [];
    for (const item of communautes_user) {
      let communaute_item = await CommuanuteController.get_communaute_item(
        item.communaute_id,
      );
      communautes.push(communaute_item);
    }

    res.send(communautes);
  } catch (error) {
    serverError(error, res);
  }
});

router.get(
  "/communaute/:communaute_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let communaute_id = parseInt(req.params.communaute_id);
      let communautes = await DB.get_data(
        "select * from communaute where communaute_id=:communaute_id",
        { communaute_id },
      );

      res.send(communautes);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//join communaute
router.post(
  "/join_communaute",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let communaute_id = req.body.communaute_id;
      let user_id = req.body.user_data.user_id;
      let data = await DB.get_data(
        "select * from communaute_user where user_id=:user_id and communaute_id=:communaute_id",
        { user_id, communaute_id },
      );
      if (data.length > 0) {
        return res.sendStatus(200);
      }
      let created_at = new Date();
      await DB.post_data(
        "insert into communaute_user(user_id,communaute_id,created_at) values(:user_id,:communaute_id,:created_at)",
        { user_id, communaute_id, created_at },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Create a community
router.post("/communaute", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let nom_communaute = HelperFunction.Ucase(req.body.nom_communaute);
    let created_at = new Date();

    if (req.files == undefined) return res.sendStatus(400);
    let logo_file = req.files.logo_communaute;
    let unique_id = HelperFunction.generate_activation_code();
    logo_file.mv(
      `./public/backend_files/bd_${unique_id}${HelperFunction.replace_space_with_underscore(
        logo_file.name,
      )}.png`,
    );
    let logo_communaute = `${
      Consts.backend_host
    }/backend_files/bd_${unique_id}${HelperFunction.replace_space_with_underscore(
      logo_file.name,
    )}.png`;

    //Create chat_id
    let with_user_id = 0;
    let chat = await DB.post_data(
      "insert into chat(user_id,with_user_id) values(:user_id,:with_user_id)",
      { user_id, with_user_id },
    );
    let chat_id = chat[0];

    if (nom_communaute.trim().length == 0) {
      return res.sendStatus(400);
    }
    if (logo_communaute.trim().length == 0) {
      return res.sendStatus(400);
    }
    let communaute = await DB.post_data(
      "insert into communaute(user_id,chat_id,nom_communaute,logo_communaute,created_at) values(:user_id,:chat_id,:nom_communaute,:logo_communaute,:created_at)",
      { user_id, chat_id, nom_communaute, logo_communaute, created_at },
    );

    //Link user to his communaute
    let communaute_id = communaute[0];
    await DB.post_data(
      "insert into communaute_user(user_id,communaute_id,created_at) values(:user_id,:communaute_id,:created_at)",
      { user_id, communaute_id, created_at },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

//Delete community
router.delete(
  "/communaute/:communaute_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let communaute_id = parseInt(req.params.communaute_id);
      //Check if user owns the community
      let owns = await CommuanuteController.owns(user_id, communaute_id);
      if (!owns) return res.sendStatus(403);

      await DB.delete_data(
        "delete from communaute where communaute_id=:communaute_id ",
        { communaute_id },
      );
      await DB.delete_data(
        "delete from communaute_user where communaute_id=:communaute_id",
        { communaute_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Edit communaute
router.patch(
  "/communaute/:communaute_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let communaute_id = parseInt(req.params.communaute_id);
      let user_id = req.body.user_data.user_id;
      let nom_communaute = req.body.nom_communaute;
      let edit_logo = false;
      let logo_communaute = "";

      if (req.files != undefined) {
        edit_logo = true;
        let logo_file = req.files.logo_communaute;
        let unique_id = HelperFunction.generate_activation_code();
        logo_file.mv(
          `./public/backend_files/bd_${unique_id}${HelperFunction.replace_space_with_underscore(
            logo_file.name,
          )}`,
        );
        logo_communaute = `${
          Consts.backend_host
        }/backend_files/bd_${unique_id}${HelperFunction.replace_space_with_underscore(
          logo_file.name,
        )}`;
      }

      //Check if user owns the community
      let owns = await CommuanuteController.owns(user_id, communaute_id);
      if (!owns) return res.sendStatus(403);

      if (nom_communaute.trim().length == 0) {
        return res.sendStatus(400);
      }

      await DB.update_data(
        "update communaute set nom_communaute=:nom_communaute where communaute_id=:communaute_id ",
        { nom_communaute, communaute_id },
      );
      if (edit_logo) {
        await DB.update_data(
          "update communaute set logo_communaute=:logo_communaute where communaute_id=:communaute_id ",
          { logo_communaute, communaute_id },
        );
      }
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Quit a community
router.delete(
  "/communaute_user/:chat_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let chat_id = parseInt(req.params.chat_id);
      let communaute = await DB.get_data(
        "select * from communaute where chat_id=:chat_id",
        { chat_id },
      );
      let user_id = req.body.user_data.user_id;
      let communaute_id = communaute[0].communaute_id;
      await DB.delete_data(
        "delete from communaute_user where communaute_id=:communaute_id and user_id=:user_id",
        {
          communaute_id,
          user_id,
        },
      );
      let deletedCommunity = await DB.delete_data(
        "delete from communaute where communaute_id=:communaute_id and user_id=:user_id",
        { communaute_id, user_id },
      );
      console.log(deletedCommunity[0].affectedRows);
      if (deletedCommunity[0].affectedRows == 1) {
        // Remove all the user from the community if deleted
        await DB.delete_data(
          "delete from communaute_user where communaute_id=:communaute_id ",
          {
            communaute_id,
          },
        );
      }
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

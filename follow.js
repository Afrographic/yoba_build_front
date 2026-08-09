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
const Axios_Private = require("../utils/axios");
const { Model_Helper } = require("../utils/model_helper.js");

//follow a user
router.post("/follow", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let follow_created_date = new Date();
    let { follow_user_id } = req.body;
    if (!Validator.validateFields({ follow_user_id }, res)) {
      return;
    }

    await Thoth_DB.post_data(
      "insert into follow(follow_user_id,follow_created_date,user_id) values(:follow_user_id,:follow_created_date,:user_id)",
      { follow_user_id, follow_created_date, user_id },
    );

    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

// unfollow user
router.delete(
  "/unfollow/:follow_user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let follow_user_id = req.params.follow_user_id;

      await Thoth_DB.post_data(
        "delete from follow where user_id=:user_id and follow_user_id=:follow_user_id",
        { user_id, follow_user_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get follower
router.get(
  "/follower/offset/:offset",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let offset = parseInt(req.params.offset);
      let limit = 10;
      let users_ids = await Thoth_DB.get_data(
        "select * from follow where follow_user_id=:user_id limit :limit offset :offset",
        { user_id, limit, offset },
      );
      let users = [];
      for (const user of users_ids) {
        let user_data = await Model_Helper.get_user_data_by_id(
          user.user_id,
          req.body.user_data.user_id,
        );
        users.push(user_data);
      }
      console.log(users);
      res.send(users);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get following
router.get(
  "/following/offset/:offset",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let offset = parseInt(req.params.offset);
      let limit = 10;
      let users_ids = await Thoth_DB.get_data(
        "select * from follow where user_id=:user_id limit :limit offset :offset",
        { user_id, limit, offset },
      );
      let users = [];
      for (const user of users_ids) {
        let user_data = await Model_Helper.get_user_data_by_id(
          user.follow_user_id,
          user_id,
        );
        users.push(user_data);
      }
      res.send(users);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// count followers
router.get(
  "/count_follower/:user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.params.user_id;
      let total = await Thoth_DB.get_data(
        "select count(*) as total from follow where follow_user_id=:user_id",
        { user_id },
      );
      if (total.length == 0) {
        res.send({ total: 0 });
        return;
      }

      res.send({ total: parseInt(total[0].total) });
    } catch (error) {
      serverError(error, res);
    }
  },
);

//count followings
router.get(
  "/count_following/:user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.params.user_id;
      let total = await Thoth_DB.get_data(
        "select count(*) as total from follow where user_id=:user_id",
        { user_id },
      );
      if (total.length == 0) {
        res.send({ total: 0 });
        return;
      }
      res.send({ total: parseInt(total[0].total) });
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Check if a user is following another one
router.get(
  "/is_following/:follow_user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let follow_user_id = req.params.follow_user_id;

      let result = await Thoth_DB.get_data(
        "select * from follow where user_id=:user_id and follow_user_id=:follow_user_id",
        {
          user_id,
          follow_user_id,
        },
      );

      res.send({ is_following: result.length > 0 });
    } catch (error) {
      serverError(error, res);
    }
  },
);
module.exports = router;

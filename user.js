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
const jwt = require("jsonwebtoken");
const Axios = require("../utils/axios");
const Axios_Private = require("../utils/axios");
const { Model_Helper } = require("../utils/model_helper.js");

// Check fullName uniqueness

router.get("/user/user_fullname/:user_fullname", async (req, res) => {
  try {
    let user_fullname = HelperFunction.Ucase(req.params.user_fullname).trim();

    let reply = await Thoth_DB.get_data(
      "SELECT * FROM user WHERE user_fullname =:user_fullname",
      { user_fullname },
    );
    res.send({
      status: 200,
      already_taken: reply.length > 0,
    });
  } catch (error) {
    serverError(error, res);
  }
});

// check for email uniqueness
router.get("/user/user_email/:user_email", async (req, res) => {
  try {
    let user_email = req.params.user_email.trim();
    let reply = await Thoth_DB.get_data(
      "SELECT * FROM user WHERE user_email =:user_email",
      { user_email },
    );
    res.send({
      already_taken: reply.length > 0,
    });
  } catch (error) {
    serverError(error, res);
  }
});

// create user account
router.post("/user", async (req, res) => {
  try {
    let user_account_activated = 1;
    let {
      country_id,
      user_fullname,
      user_email,
      user_password,
      user_confirm_password,
      user_school,
    } = req.body;
    let user_created_date = new Date();
    let fields_ok = Validator.validateFields(
      {
        country_id,
        user_fullname,
        user_email,
        user_password,
        user_confirm_password,
        user_school,
      },
      res,
    );
    if (!fields_ok) {
      return;
    }

    if (user_confirm_password != user_password) {
      res.sendStatus(401);
      return;
    }

    user_fullname = HelperFunction.Ucase(user_fullname);
    user_school = HelperFunction.Ucase(user_school);
    user_password = Security.encryptPassword(user_password);
    user_avatar = Consts.avatar_file_id;
    country_id = parseInt(country_id);

    let data = await Thoth_DB.post_data(
      "insert into user(country_id,user_fullname,user_email,user_password,user_avatar,user_created_date,user_school,user_account_activated) values(:country_id,:user_fullname,:user_email,:user_password,:user_avatar,:user_created_date,:user_school,:user_account_activated) ",
      {
        country_id,
        user_fullname,
        user_email,
        user_password,
        user_avatar,
        user_created_date,
        user_school,
        user_account_activated,
      },
    );

    let user_id = data[0];
    let token = Security.generateToken({ user_id });

    res.send({ token });
  } catch (error) {
    serverError(error, res);
  }
});

router.post("/login", async (req, res) => {
  try {
    let { user_email, user_fullname, user_password } = req.body;
    let fieldsOK = Validator.validateFields({ user_password }, res);
    if (!fieldsOK) {
      return;
    }
    user_email = user_email ?? "";
    user_fullname = user_fullname ?? "";
    user_fullname = HelperFunction.Ucase(user_fullname);
    user_password = Security.encryptPassword(user_password);
    let user = await Thoth_DB.get_data(
      "SELECT user_id FROM user WHERE  user_password=:user_password AND (user_email=:user_email OR user_fullname=:user_fullname)",
      {
        user_password,
        user_email,
        user_fullname,
      },
    );

    let user_model = {};
    user_model.user_id = user[0].user_id;

    if (user.length == 0) {
      res.statusCode = 404;
      res.send({
        msg: "This user does not exist!",
      });
      return;
    }

    let token = Security.generateToken(user_model);
    res.send({
      token,
    });
  } catch (error) {
    serverError(error, res);
  }
});

// authenticate user token
router.get("/token/:token", async (req, res) => {
  try {
    let token = req.params.token;

    jwt.verify(token, Consts.ACCESS_TOKEN_SECRET, async (err, user_data) => {
      if (err) return res.sendStatus(403);
      req.body.user_data = user_data;
      res.sendStatus(200);
    });
  } catch (error) {
    serverError(error, res);
  }
});

// Get user data
router.get("/user", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let user_data = await Thoth_DB.get_data(
      "SELECT user.country_id,country_name,country_flag,user_account_activated,user_email,user_school,user_id,user_fullname,user_avatar,user_bio,user_created_date FROM user,country WHERE user_id=:user_id and user.country_id=country.country_id",
      { user_id },
    );
    if (user_data[0].user_avatar) {
      user_data[0].user_avatar = `${Consts.stream_url}${user_data[0].user_avatar}`;
      //check admin state
      let admins = await Thoth_DB.get_data(
        "select * from admin where user_id=:user_id",
        { user_id },
      );
      user_data[0].is_admin = admins.length > 0;
    }
    user_data[0].is_following = false;
    res.send(user_data[0]);
  } catch (error) {
    serverError(error, res);
  }
});

// get user_data by url
router.get("/user/:user_id", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.params.user_id;
    let user_data = await Thoth_DB.get_data(
      "SELECT user.country_id,country_name,country_flag,user_account_activated,user_email,user_school,user_id,user_fullname,user_avatar,user_bio,user_created_date FROM user,country WHERE user_id=:user_id and user.country_id=country.country_id",
      { user_id },
    );

    if (user_data[0].user_avatar) {
      user_data[0].user_avatar = `${Consts.stream_url}${user_data[0].user_avatar}`;
    }

    let follow = await Model_Helper.check_if_user_following(
      req.body.user_data.user_id,
      user_id,
    );

    user_data[0].is_following = follow.is_following;

    res.send(user_data[0]);
  } catch (error) {
    serverError(error, res);
  }
});

// get users
router.get(
  "/users/offset/:offset",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let offset = parseInt(req.params.offset);
      let limit = 10;
      let user_ids = await Thoth_DB.get_data(
        "select user_id from user where user_account_activated = 1 and user_id != :user_id order by user_id DESC limit :limit offset :offset",
        { limit, offset, user_id },
      );
      let users = [];
      for (const user_item of user_ids) {
        let user = await Model_Helper.get_user_data_by_id(
          user_item.user_id,
          req.body.user_data.user_id,
        );
        users.push(user);
      }
      res.send(users);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// search user
router.get(
  "/search_user/:token",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let token = req.params.token;
      let users = await Thoth_DB.get_data(
        `SELECT user_id from user where user_account_activated = 1 and user_fullname like '%${token}%'`,
      );
      let users_to_return = [];
      for (const user_item of users) {
        let user = await Model_Helper.get_user_data_by_id(
          user_item.user_id,
          req.body.user_data.user_id,
        );
        users_to_return.push(user);
      }
      res.send(users_to_return);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// count all users
router.get("/count_users", Security.authenticateToken, async (req, res) => {
  try {
    let total = await Thoth_DB.get_data(
      "select count(user_id) as total from user where user_account_activated = 1 ",
    );
    res.send({ total: parseInt(total[0].total) });
  } catch (error) {
    serverError(error, res);
  }
});
module.exports = router;

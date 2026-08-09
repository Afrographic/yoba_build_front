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

router.post("/user_test", Security.authenticateToken, async (req, res) => {
  try {
    let user_test_created_date = new Date();
    let user_id = req.body.user_date.user_id;
    let { test_ongoing_id, room_id } = req.body;

    if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
      res.sendStatus(401);
      return;
    }

    await Thoth_DB.post_data(
      "insert into user_test(user_test_created_date,test_ongoing_id,user_id) values(:user_test_created_date,:test_ongoing_id,:user_id)",
      { user_test_created_date, test_ongoing_id, user_id },
    );

    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

// get the active user on a test
router.get(
  "/user_test/room/:room_id/:test_ongoing_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let room_id = req.params.room_id;
      let test_ongoing_id = req.params.test_ongoing_id;

      if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      let users = await Thoth_DB.get_data(
        "select user.school,user.user_fullname,user_avatar from user,user_test where user_test.user_id = user.user_id where test_ongoing_id=:test_ongoing_id order by user_test_created_date DESC",
        { test_ongoing_id },
      );
      for (let i = 0; i < users.length; i++) {
        if (users[i].user_avatar) {
          users[i].user_avatar = `${Consts.stream_url}${users[i].user_avatar}`;
        }
      }

      res.send(users);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

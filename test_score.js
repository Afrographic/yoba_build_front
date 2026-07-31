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

// post score
router.post("/test_score", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let { test_score_value, test_score_total, test_over_id } = req.body;

    await Thoth_DB.post_data(
      "insert into test_score(test_score_value, test_score_total, test_over_id,user_id) values(:test_score_value, :test_score_total, :test_over_id,:user_id)",
      {
        test_score_value,
        test_score_total,
        test_over_id,
        user_id,
      },
    );

    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

// get the scores
router.get(
  "/test_score/:test_over_id/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let room_id = parseInt(req.params.room_id);

      if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      let scores = await Thoth_DB.get_data(
        "select user.user_fullname,user.user_school,user.user_avatar,test_score.* from test_score where test_over_id=:test_over_id and test_score.user_id = user.user_id order test_score_value DESC",
        { test_over_id },
      );

      for (const score of scores) {
        if (score.user_avatar) {
          score.user_avatar = `${Consts.stream_url}${score.user_avatar}`;
        }
      }

      res.send(scores);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

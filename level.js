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
const { Level_Controller } = require("../controllers/level_controller.js");

// Create a level
router.post("/level", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let { level_name } = req.body;
    let allFieldsOk = Validator.validateFields({ level_name }, res);
    if (!allFieldsOk) {
      return;
    }
    let level_created_date = new Date();
    level_name = HelperFunction.Ucase(level_name);

    await Thoth_DB.post_data(
      "insert into level(level_name,user_id,level_created_date) values(:level_name,:user_id,:level_created_date)",
      { level_name, user_id, level_created_date },
    );

    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

// get all the levels
router.get(
  "/level/user/:user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.params.user_id;
      let levels = await Thoth_DB.get_data(
        "SELECT * from level where user_id =:user_id order by level_name DESC",
        { user_id },
      );
      levels = await get_level_metadata(levels);
      res.send(levels);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function get_level_metadata(levels) {
  for (const level of levels) {
    let index = levels.indexOf(level);
    let total_quiz = await Level_Controller.count_quiz(level.level_id);
    let total_flascard = await Level_Controller.count_flashcard(level.level_id);
    let total_cours = await Level_Controller.count_cours(level.level_id);
    levels[index].total_quiz = total_quiz;
    levels[index].total_flascard = total_flascard;
    levels[index].total_cours = total_cours;
  }
  return levels;
}

// count all the quizes of a level
router.get(
  "/count_quiz/level/:level_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let level_id = parseInt(req.params.level_id);

      let total = await Thoth_DB.get_data(
        "select count(*) as total from quiz where level_id=:level_id ",
        { level_id },
      );

      res.send({
        total: parseInt(total[0].total),
      });
    } catch (error) {
      serverError(error, res);
    }
  },
);

// count all the flashcards of a level

router.get(
  "/count_flashcard/level/:level_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let level_id = parseInt(req.params.level_id);

      let total = await Thoth_DB.get_data(
        "select count(*) as total from flashcard where level_id=:level_id",
        { level_id },
      );

      res.send({ total: parseInt(total[0].total) });
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get all the subjects of a level
router.get(
  "/get_subjects/level/:level_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let level_id = parseInt(req.params.level_id);
      let subjects = await Thoth_DB.get_data(
        "select * from subject where level_id =:level_id",
        { level_id },
      );
      res.send(subjects);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// edit level name
router.patch(
  "/level/:level_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let level_id = parseInt(req.params.level_id);
      let user_id = req.body.user_data.user_id;
      let { level_name } = req.body;
      let allFieldsOk = Validator.validateFields({ level_name }, res);
      if (!allFieldsOk) {
        return;
      }

      if (!(await OwnerShipChecker.is_level_owner(level_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      level_name = HelperFunction.Ucase(level_name);
      await Thoth_DB.update_data(
        "update level set level_name=:level_name where level_id=:level_id",
        { level_name, level_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// delete a level

router.delete(
  "/level/:level_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let level_id = parseInt(req.params.level_id);
      let user_id = req.body.user_data.user_id;
      if (!(await OwnerShipChecker.is_level_owner(level_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      await Thoth_DB.delete_data("delete from level where level_id=:level_id", {
        level_id,
      });
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

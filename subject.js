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
const { Subject_Controller } = require("../controllers/subject_controller.js");

router.post("/subject", Security.authenticateToken, async (req, res) => {
  try {
    let subject_created_date = new Date();
    let user_id = req.body.user_data.user_id;
    let { subject_name, level_id, room_id } = req.body;

    let field_ok = Validator.validateFields({ subject_name, level_id }, res);
    if (!field_ok) {
      return;
    }

    if (parseInt(room_id) == 0) {
      if (!(await OwnerShipChecker.is_level_owner(level_id, user_id))) {
        res.sendStatus(401);
        return;
      }
    }

    subject_name = HelperFunction.Ucase(subject_name);
    await Thoth_DB.post_data(
      "INSERT INTO subject(room_id,subject_name,level_id,subject_created_date,user_id) VALUES(:room_id,:subject_name,:level_id,:subject_created_date,:user_id)",
      { room_id, subject_name, level_id, subject_created_date, user_id },
    );

    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

router.get(
  "/subject/level/:level_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let level_id = req.params.level_id;
      let subjects = await Thoth_DB.get_data(
        "select * from subject where  level_id=:level_id",
        { level_id },
      );
      subjects = await get_subjects_meta_data(subjects);
      res.send(subjects);
    } catch (error) {
      serverError(error, res);
    }
  },
);
router.get(
  "/subject_room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let room_id = req.params.room_id;
      let subjects = await Thoth_DB.get_data(
        "select * from subject where  room_id=:room_id",
        { room_id },
      );
      subjects = await get_subjects_meta_data(subjects);
      res.send(subjects);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function get_subjects_meta_data(subjects) {
  for (const subject of subjects) {
    let index = subjects.indexOf(subject);
    let total_quiz = await Subject_Controller.count_quiz(subject.subject_id);
    let total_flascard = await Subject_Controller.count_flashcard(
      subject.subject_id,
    );
    let total_cours = await Subject_Controller.count_cours(subject.subject_id);
    subjects[index].total_quiz = total_quiz;
    subjects[index].total_flascard = total_flascard;
    subjects[index].total_cours = total_cours;
  }
  return subjects;
}

router.get(
  "/count_quiz/subject/:subject_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let subject_id = req.params.subject_id;
      let total = Subject_Controller.count_quiz(subject_id);
      res.send({ total });
    } catch (error) {
      services.serverError(error, res);
    }
  },
);

router.get(
  "/count_flashcard/subject/:subject_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let subject_id = req.params.subject_id;
      let total = Subject_Controller.count_flashcard(subject_id);
      res.send({ total });
    } catch (error) {
      services.serverError(error, res);
    }
  },
);

// edit subject name
router.patch(
  "/subject/:subject_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let subject_id = parseInt(req.params.subject_id);
      let user_id = req.body.user_data.user_id;
      let { subject_name } = req.body;
      let allFieldsOk = Validator.validateFields({ subject_name }, res);
      if (!allFieldsOk) {
        return;
      }

      if (!(await OwnerShipChecker.is_subject_owner(subject_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      subject_name = HelperFunction.Ucase(subject_name);
      await Thoth_DB.update_data(
        "update subject set subject_name=:subject_name where subject_id=:subject_id",
        { subject_name, subject_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// delete a subject

router.delete(
  "/subject/:subject_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let subject_id = parseInt(req.params.subject_id);
      let user_id = req.body.user_data.user_id;
      if (!(await OwnerShipChecker.is_subject_owner(subject_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      await Thoth_DB.delete_data(
        "delete from subject where subject_id=:subject_id",
        { subject_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

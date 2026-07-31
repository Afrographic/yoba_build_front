const express = require("express");
const router = express.Router();
const { Security } = require("../../utils/security");
const { Validator } = require("../../utils/validator");
const { HelperFunction } = require("../../utils/helper_function");
const { HelperFile } = require("../../utils/helper_file.js");
const { OwnerShipChecker } = require("../../utils/ownership_checker.js");
const { Consts } = require("../../consts.js");
const { Thoth_DB } = require("../../thoth_db.js");
const { serverError } = require("../../utils/server_error.js");
const Axios_Private = require("../../utils/axios");
const { Quiz_Controller } = require("../../controllers/quiz_controller.js");
const { Model_Helper } = require("../../utils/model_helper.js");
const { Drive_Service } = require("../../services/drive/drive.js");

// Create a quiz
router.post("/quiz", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let quiz_created_date = new Date();
    let {
      quiz_consigne,
      quiz_duration,
      level_id,
      subject_id,
      chapter_id,
      room_id,
    } = req.body;
    let quiz_image = "";

    let fields_ok = Validator.validateFields(
      { quiz_consigne, quiz_duration, level_id, subject_id, chapter_id },
      res,
    );

    if (!fields_ok) {
      return;
    }

    if (parseInt(quiz_duration) < 5) {
      res.sendStatus(401);
      return;
    }

    if (Validator.valid_image_upload(req)) {
      quiz_image = await Drive_Service.upload_file(
        req.files.file.name,
        req.files.file.data,
      );
    }

    let quiz = await Thoth_DB.post_data(
      "insert into quiz(room_id,quiz_consigne,quiz_duration,quiz_image,quiz_created_date,user_id,level_id,subject_id,chapter_id) values(:room_id,:quiz_consigne,:quiz_duration,:quiz_image,:quiz_created_date,:user_id,:level_id,:subject_id,:chapter_id)",
      {
        room_id,
        quiz_consigne,
        quiz_duration,
        quiz_image,
        quiz_created_date,
        user_id,
        level_id,
        subject_id,
        chapter_id,
      },
    );
    let quiz_id = quiz[0];
    res.send({ quiz_id });
  } catch (error) {
    serverError(error, res);
  }
});

// laod quiz from the home screen
router.get(
  "/quiz_home/offset/:offset",
  Security.authenticateToken,
  async (req, res) => {
    try {
      // will customize the home later
      let user_id = req.body.user_data.user_id;
      let offset = JSON.parse(req.params.offset);

      let quizs = await Thoth_DB.get_data(`SELECT quiz.*,
                                                 user_fullname,
                                                 user_avatar,
                                                 user_school,
                                                 level_name,
                                                 subject_name,
                                                 chapter_name
                                          FROM exercice,user,level,subject,chapter
                                          where quiz.level_id = level.level_id and quiz.chapter_id = chapter.chapter_id and quiz.subject_id = subject.subject_id
                                          ORDER BY quiz_id DESC
                                          LIMIT 10 OFFSET ${offset}`);

      for (const i in quizs) {
        if (quizs[i].user_avatar)
          quizs[i].user_avatar = `${Consts.stream_url}${quizs[i].user_avatar}`;
        if (quizs[i].quiz_image && quizs[i].quiz_image.trim().length > 0)
          quizs[i].quiz_image = `${Consts.stream_url}${quizs[i].quiz_image}`;
      }

      res.send(quizs);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// count the question on a quiz
router.get(
  "/count_question/quiz/:quiz_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let quiz_id = req.params.quiz_id;

      let total = await Thoth_DB.get_data(`SELECT count(*) as total
                                           FROM question
                                           WHERE quiz_id = ${quiz_id}
                                          `);
      res.send({
        total: total[0].total,
      });
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get a single quiz
router.get("/quiz/:quiz_id", Security.authenticateToken, async (req, res) => {
  try {
    let quiz_id = req.params.quiz_id;

    let quiz = await Thoth_DB.get_data(
      `SELECT quiz.*,
                                                 user_fullname,
                                                 user_avatar,
                                                 user_school,
                                                 level_name,
                                                 chapter_name,
                                                 subject_name
                                          FROM quiz,user,subject,level,chapter
                                         where quiz_id=:quiz_id and quiz.level_id = level.level_id and quiz.chapter_id=chapter.chapter_id and user.user_id = quiz.user_id`,
      { quiz_id },
    );

    if (quiz.length == 0) {
      res.send({});
      return;
    }

    let quiz_item = quiz[0];

    // get total question
    quiz_item.elapsed_time = HelperFunction.get_elapsed_time(
      quiz_item.quiz_created_date,
    );
    let axios_res = await Model_Helper.get_total_question(quiz_item.quiz_id);
    quiz_item.total_question = axios_res.total;
    if (quiz_item.user_avatar) {
      quiz_item.user_avatar = `${Consts.stream_url}${quiz_item.user_avatar}`;
    }
    if (quiz_item.quiz_image && quiz_item.quiz_image.trim().length > 0) {
      quiz_item.quiz_image = `${Consts.stream_url}${quiz_item.quiz_image}`;
    }

    res.send(quiz_item);
  } catch (error) {
    serverError(error, res);
  }
});

// get a single quiz for subject
router.get(
  "/subject_quiz/:quiz_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let quiz_id = req.params.quiz_id;

      let quiz = await Thoth_DB.get_data(
        `SELECT quiz.*,
                                                 user_fullname,
                                                 user_avatar,
                                                 user_school
                                                
                                          FROM quiz,user
                                         where quiz_id=:quiz_id and user.user_id = quiz.user_id`,
        { quiz_id },
      );

      if (quiz.length == 0) {
        res.send({});
        return;
      }

      let quiz_item = quiz[0];

      // get total question
      quiz_item.elapsed_time = HelperFunction.get_elapsed_time(
        quiz_item.quiz_created_date,
      );
      let axios_res = await Model_Helper.get_total_question(quiz_item.quiz_id);
      quiz_item.total_question = axios_res.total;
      quiz_item.level_id = 0;
      quiz_item.subject_id = 0;
      quiz_item.chapter_id = 0;
      quiz_item.level_name = "";
      quiz_item.subject_name = "";
      quiz_item.chapter_name = "";
      if (quiz_item.user_avatar) {
        quiz_item.user_avatar = `${Consts.stream_url}${quiz_item.user_avatar}`;
      }
      if (quiz_item.quiz_image && quiz_item.quiz_image.trim().length > 0) {
        quiz_item.quiz_image = `${Consts.stream_url}${quiz_item.quiz_image}`;
      }

      res.send(quiz_item);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// delete a quiz
router.delete(
  "/quiz/:quiz_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let quiz_id = req.params.quiz_id;

      await Quiz_Controller.delete_quiz_image(quiz_id);

      await Thoth_DB.delete_data(
        "delete from quiz where quiz_id=:quiz_id and user_id=:user_id",
        { quiz_id, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// edit quiz chapter
router.patch(
  "/chapter/quiz/:quiz_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let quiz_id = req.params.quiz_id;
      let { chapter_id } = req.body;

      if (!Validator.validateFields({ chapter_id }, res)) {
        return;
      }

      if (!(await OwnerShipChecker.is_quiz_owner(quiz_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      if (!(await OwnerShipChecker.is_chapter_owner(chapter_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      await Thoth_DB.update_data(
        "update quiz set chapter_id=:chapter_id where quiz_id=:quiz_id",
        { chapter_id, quiz_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// edit quiz consigne
router.patch(
  "/consigne/quiz/:quiz_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let quiz_id = req.params.quiz_id;
      let { quiz_consigne } = req.body;

      if (!Validator.validateFields({ quiz_consigne }, res)) {
        return;
      }

      if (!(await OwnerShipChecker.is_quiz_owner(quiz_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      await Thoth_DB.update_data(
        "update quiz set quiz_consigne=:quiz_consigne where quiz_id=:quiz_id",
        { quiz_consigne, quiz_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/duration/quiz/:quiz_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let quiz_id = req.params.quiz_id;
      let { quiz_duration } = req.body;

      if (!Validator.validateFields({ quiz_duration }, res)) {
        return;
      }

      if (!(await OwnerShipChecker.is_quiz_owner(quiz_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      if (parseInt(quiz_duration) <= 0) {
        res.sendStatus(401);
        return;
      }

      await Thoth_DB.update_data(
        "update quiz set quiz_duration=:quiz_duration where quiz_id=:quiz_id",
        { quiz_duration, quiz_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// add quiz image
router.patch(
  "/image/quiz/:quiz_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let quiz_id = req.params.quiz_id;
      let quiz_image = "";

      if (!Validator.valid_image_upload(req)) {
        res.sendStatus(401);
        return;
      }

      await Quiz_Controller.delete_quiz_image(quiz_id);

      if (req.files.file != null) {
        quiz_image = await Drive_Service.upload_file(
          req.files.file.name,
          req.files.file.data,
        );
      }

      await Thoth_DB.update_data(
        "update quiz set quiz_image=:quiz_image where quiz_id=:quiz_id and user_id=:user_id",
        { quiz_image, quiz_id, user_id },
      );

      res.send({ quiz_image: `${Consts.stream_url}${quiz_image}` });
    } catch (error) {
      serverError(error, res);
    }
  },
);

// delete quiz _image
router.patch(
  "/remove_quiz_image/:quiz_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let quiz_id = req.params.quiz_id;
      let user_id = req.body.user_data.user_id;
      let quiz_image = "";

      await Quiz_Controller.delete_quiz_image(quiz_id);

      await Thoth_DB.update_data(
        "update quiz set quiz_image=:quiz_image where quiz_id=:quiz_id and user_id=:user_id",
        { quiz_image, quiz_id, user_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// Get Quiz of a chapter
router.get(
  "/quiz/chapter/:chapter_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let chapter_id = req.params.chapter_id;
      let quizs_db = await Thoth_DB.get_data(
        "select quiz_id from quiz where quiz.chapter_id=:chapter_id order by quiz_id DESC",
        { chapter_id },
      );

      let quizs = [];

      for (const quiz of quizs_db) {
        let quiz_item = await Model_Helper.get_quiz_item(quiz.quiz_id);
        quizs.push(quiz_item);
      }

      res.send(quizs);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get total question of a quiz
router.get(
  "/total_question/quiz/:quiz_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let quiz_id = req.params.quiz_id;
      let total = await Thoth_DB.get_data(
        "select count(*) as total from question where quiz_id=:quiz_id",
        { quiz_id },
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

// get all the quiz done by a user
router.get("/quiz_done", Security.authenticateToken, async (req, res) => {
  try {
    let quizs = [];
    let user_id = req.body.user_data.user_id;
    let quiz_ids = await Thoth_DB.get_data(
      "select quiz_id from quiz_done where user_id=:user_id",
      { user_id },
    );
    for (const quiz_item of quiz_ids) {
      let quiz = await Model_Helper.get_quiz_item(quiz_item.quiz_id);
      quizs.push(quiz);
    }
    req.send(quizs);
  } catch (error) {
    serverError(error, res);
  }
});

// tell if a quiz has already been practiced by a user
router.get(
  "/quiz_practiced/:quiz_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let quiz_id = req.params.quiz_id;
      let quizs = await Thoth_DB.get_data(
        "select * from quiz_done where user_id=:user_id and quiz_id=:quiz_id",
        { user_id, quiz_id },
      );
      if (quizs.length == 0) {
        res.send({ status: 404 });
        return;
      }
      let payload = {};
      payload.quiz_done_created_date = quizs[0].quiz_done_created_date;
      payload.elapsed_time = HelperFunction.get_elapsed_time(
        quizs[0].quiz_done_created_date,
      );
      res.send({ status: 200, payload: payload });
    } catch (error) {
      serverError(error, res);
    }
  },
);

//get quiz generale
router.get(
  "/quiz-generale/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let room_id = parseInt(req.params.room_id);
      let data = await Thoth_DB.get_data(
        "select * from quiz where room_id=:room_id and level_id= 0 and subject_id=0 and chapter_id=0 order by quiz_id DESC",
        { room_id },
      );

      let quizs = [];

      for (const quiz of data) {
        let quiz_item = await Model_Helper.get_quiz_item(quiz.quiz_id);
        quizs.push(quiz_item);
      }

      res.send(quizs);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

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
const { Drive_Service } = require("../../services/drive/drive.js");
const {
  Quiz_Question_controller,
} = require("../../controllers/quiz_question.js");

router.post("/question", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let question_created_date = new Date();
    let question_image = "";
    let { question_text, quiz_id, props,rich_text } = req.body;


    if (!Validator.validateFields({ quiz_id, props }, res)) {
      return;
    }

    if (!(await OwnerShipChecker.is_quiz_owner(quiz_id, user_id))) {
      res.sendStatus(401);
      return;
    }

    if (Validator.valid_image_upload(req)) {
      question_image = await Drive_Service.upload_file(
        req.files.file.name,
        req.files.file.data,
      );
    }

    props = JSON.parse(props);
    if (props.length == 0) {
      res.sendStatus(400);
      return;
    }

    let question = await Thoth_DB.post_data(
      "insert into question(rich_text,question_text,question_created_date,question_image,quiz_id,user_id) values(:rich_text,:question_text,:question_created_date,:question_image,:quiz_id,:user_id)",
      {
        rich_text,
        question_text,
        question_created_date,
        question_image,
        quiz_id,
        user_id,
      },
    );

    let question_id = question[0];
    let chat_id = await create_chat_instance();

    await Thoth_DB.update_data(
      "update question set chat_id=:chat_id where question_id=:question_id",
      { chat_id, question_id },
    );

    // save props
    await save_props(props, question_id, user_id);

    res.send({ question_id });
  } catch (error) {
    serverError(error, res);
  }
});

async function save_props(props, question_id, user_id) {
  for (const prop of props) {
    let question_prop_created_date = new Date();
    let question_prop_value = prop.question_prop_value;
    let rich_text = prop.rich_text;
    let image =  prop.image;
    let question_prop_is_answer =
      prop.question_prop_is_answer == 1 ? "true" : "false";
    question_id = question_id;
    user_id = user_id;

    await Thoth_DB.post_data(
      "insert into question_prop(rich_text,image,question_prop_value,question_prop_is_answer,question_prop_created_date,question_id,user_id) values(:rich_text,:image,:question_prop_value,:question_prop_is_answer,:question_prop_created_date,:question_id,:user_id)",
      {
        rich_text,
        image,
        question_prop_value,
        question_prop_is_answer,
        question_prop_created_date,
        question_id,
        user_id,
      },
    );
  }
}

async function create_chat_instance() {
  let chat_created_date = new Date();
  let chat = await Thoth_DB.post_data(
    "insert into chat(chat_created_date) values(:chat_created_date) ",
    { chat_created_date },
  );
  return chat[0];
}

// edit question text
router.patch(
  "/text/question/:question_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let question_id = req.params.question_id;
      let user_id = req.body.user_data.user_id;
      let { rich_text } = req.body;


      if (!(await OwnerShipChecker.is_question_owner(question_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      await Thoth_DB.update_data(
        "update question set rich_text=:rich_text where question_id=:question_id",
        { rich_text, question_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// edit question image
router.patch(
  "/image_question/:question_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let question_id = req.params.question_id;
      let user_id = req.body.user_data.user_id;

      if (!Validator.valid_image_upload(req)) {
        res.sendStatus(401);
        return;
      }

      await HelperFunction.delete_db_file(
        "private",
        "question",
        "question_image",
        "question_id",
        question_id,
      );

      let question_image = await Drive_Service.upload_file(
        req.files.file.name,
        req.files.file.data,
      );

      await Thoth_DB.update_data(
        "update question set question_image=:question_image where question_id=:question_id and user_id=:user_id",
        { question_image, question_id, user_id },
      );

      res.send({ question_image: `${Consts.stream_url}${question_image}` });
    } catch (error) {
      serverError(error, res);
    }
  },
);

// add text explanation
router.patch(
  "/explain_text/question/:question_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let question_id = req.params.question_id;
      let user_id = req.body.user_data.user_id;
      let { question_explain_text } = req.body;

      if (!Validator.validateFields({ question_explain_text }, res)) {
        return;
      }

      await Thoth_DB.update_data(
        "update question set question_explain_text=:question_explain_text where question_id=:question_id and user_id=:user_id",
        { question_explain_text, question_id, user_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// Add Voice explanation
router.patch(
  "/explain_voice/question/:question_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let question_id = req.params.question_id;
      let user_id = req.body.user_data.user_id;
      let question_explain_voice_url = "";
      let { question_explain_voice_duration } = req.body;

      if (!Validator.validateFields({ question_explain_voice_duration }, res)) {
        return;
      }

      if (!(await OwnerShipChecker.is_question_owner(question_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      if (!Validator.valid_voice_upload(req)) {
        res.sendStatus(401);
        return;
      }

      await HelperFunction.delete_db_file(
        "private",
        "question",
        "question_explain_voice_url",
        "question_id",
        question_id,
      );

      question_explain_voice_url = await Drive_Service.upload_file(
        req.files.file.name,
        req.files.file.data,
      );

      await Thoth_DB.update_data(
        "update question set question_explain_voice_url=:question_explain_voice_url,question_explain_voice_duration=:question_explain_voice_duration where question_id=:question_id",
        {
          question_explain_voice_url,
          question_explain_voice_duration,
          question_id,
        },
      );

      res.send({
        question_explain_voice_url: `${Consts.stream_url}${question_explain_voice_url}`,
      });
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get the questions of a quiz
router.get(
  "/question/quiz/:quiz_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let quiz_id = JSON.parse(req.params.quiz_id);
      let questions = await Quiz_Question_controller.get_questions(quiz_id);
      res.send(questions);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get(
  "/user_interact_question/:chat_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let chat_id = req.params.chat_id;
      let users = await Thoth_DB.get_data(
        "SELECT DISTINCT user.user_id,user_avatar from comment,user where comment.user_id = user.user_id and comment.chat_id = :chat_id limit 25",
        { chat_id },
      );
      let user_avatars = [];
      for (const user of users) {
        user_avatars.push(`${Consts.stream_url}${user.user_avatar}`);
      }

      res.send(user_avatars);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// router.get("/quiz/question/dataForStackedAvatar/:idQuestion", async (req, res) => {
//     try {
//         let idQuestion = JSON.parse(req.params.idQuestion);
//         let users = await Thoth_DB.query(`SELECT DISTINCT comments.UserId as idUser,
//                                                            user.fullName,
//                                                            user.avatar,
//                                                            user.school as description
//                                            FROM comments
//                                            INNER JOIN user ON user.id = comments.UserId
//                                            WHERE comments.QuestionId = ${idQuestion}
//                                            LIMIT 25
//         `, {
//             type: Thoth_DB.QueryTypes.SELECT
//         });

//         res.send({
//             status: 200,
//             users: users
//         })
//     } catch (error) {
//         serverError(error, res);
//     }
// })

// Delete quiz question
router.delete(
  "/question/:question_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let question_id = req.params.question_id;

      if (!(await OwnerShipChecker.check("question", question_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      delete_associated_files(question_id);

      await Thoth_DB.delete_data(
        "delete from question where question_id=:question_id and user_id=:user_id",
        { question_id, user_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function delete_associated_files(question_id) {
  let questions = await Thoth_DB.get_data(
    "select * from question where question_id = :question_id",
    { question_id },
  );
  Drive_Service.delete_file(questions[0].question_image);
  Drive_Service.delete_file(questions[0].question_explain_image);
  Drive_Service.delete_file(questions[0].question_explain_file);
  Drive_Service.delete_file(questions[0].question_explain_voice_url);
}

module.exports = router;

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
const Axios = require("../../utils/axios");

router.post("/question_prop", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let question_prop_created_date = new Date();
    let { question_id, question_prop_value, question_prop_is_answer } =
      req.body;

    if (
      !Validator.validateFields(
        { question_id, question_prop_value, question_prop_is_answer },
        res,
      )
    ) {
      return;
    }

    if (!(await OwnerShipChecker.is_question_owner(question_id, user_id))) {
      res.sendStatus(401);
      return;
    }

    if (
      !(question_prop_is_answer == "true" || question_prop_is_answer == "false")
    ) {
      res.status(401).send("Is answer can only be true of false!");
      return;
    }

    if (question_prop_is_answer == "true") {
      let props = await get_props(question_id);
      if (have_already_a_correct_answer(props)) {
        res.status(401).send("Cannot have two correct answers!");
        return;
      }
    }

    let question_prop = await Thoth_DB.post_data(
      "insert into question_prop(question_prop_value,question_prop_is_answer,question_prop_created_date,question_id,user_id) values(:question_prop_value,:question_prop_is_answer,:question_prop_created_date,:question_id,:user_id)",
      {
        question_prop_value,
        question_prop_is_answer,
        question_prop_created_date,
        question_id,
        user_id,
      },
    );

    let question_prop_id = question_prop[0];

    res.send({ question_prop_id });
  } catch (error) {
    serverError(error, res);
  }
});

async function get_props(question_id) {
  let props = await Thoth_DB.get_data(
    "select * from question_prop where question_id=:question_id",
    { question_id },
  );
  return props;
}

// get question props
router.get(
  "/prop/question/:question_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let question_id = req.params.question_id;
      let props = await get_props(question_id);
      res.send(props);
    } catch (error) {
      serverError(error, res);
    }
  },
);

function have_already_a_correct_answer(props) {
  for (const prop of props) {
    if (prop.question_prop_is_answer == "true") {
      return true;
    }
  }
  return false;
}

// edit gap_prop_value
router.patch(
  "/value/question_prop/:question_prop_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let question_prop_id = req.params.question_prop_id;
      let { rich_text } = req.body;

      await Thoth_DB.update_data(
        "update question_prop set rich_text=:rich_text where question_prop_id=:question_prop_id",
        { rich_text, question_prop_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// edit correct anwser
router.patch(
  "/edit_correct_answer/question/:question_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let question_id = req.params.question_id;
      let { question_prop_id } = req.body;

      if (!Validator.validateFields({ question_prop_id }, res)) {
        return;
      }

      if (
        !(await OwnerShipChecker.check(
          "question_prop",
          question_prop_id,
          user_id,
        ))
      ) {
        res.sendStatus(401);
        return;
      }

      if (!(await OwnerShipChecker.check("question", question_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      if (!(await is_question_prop(question_id, question_prop_id))) {
        req.sendStatus(401);
        return;
      }

      // set the original correct answer to false
      await Thoth_DB.update_data(
        "update question_prop set question_prop_is_answer = 'false' where question_prop_is_answer='true' and question_id=:question_id",
        { question_id },
      );

      await Thoth_DB.update_data(
        "update question_prop set question_prop_is_answer='true' where question_prop_id=:question_prop_id",
        { question_prop_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function is_question_prop(question_id, question_prop_id) {
  let res = await Thoth_DB.get_data(
    "select * from  question_prop where question_id=:question_id and question_prop_id=:question_prop_id",
    { question_id, question_prop_id },
  );
  return res.length > 0;
}

// delete question  prop
router.delete(
  "/question_prop/:question_prop_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let question_prop_id = req.params.question_prop_id;
      let user_id = req.body.user_data.user_id;

      if (
        !(await OwnerShipChecker.check(
          "question_prop",
          question_prop_id,
          user_id,
        ))
      ) {
        res.sendStatus(401);
        return;
      }

      await Thoth_DB.delete_data(
        "delete from question_prop where question_prop_id=:question_prop_id",
        { question_prop_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

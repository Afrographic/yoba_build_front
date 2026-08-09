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

router.post("/flashcard_question", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let flashcard_question_created_date = new Date();
        let { flashcard_question_text, flashcard_question_answer, flashcard_id } = req.body;


        if (!Validator.validateFields({ flashcard_question_text, flashcard_question_answer, flashcard_id }, res)) {
            console.log("Error here?");
            return;
        }

        if (!(await OwnerShipChecker.check("flashcard", flashcard_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        flashcard_question_text = HelperFunction.Ucase(flashcard_question_text)
        flashcard_question_answer = HelperFunction.Ucase(flashcard_question_answer)

        await Thoth_DB.post_data("insert into flashcard_question(flashcard_question_text,flashcard_question_answer,flashcard_question_created_date,flashcard_id,user_id) values(:flashcard_question_text,:flashcard_question_answer,:flashcard_question_created_date,:flashcard_id,:user_id)", {
            flashcard_question_text, flashcard_question_answer, flashcard_question_created_date, flashcard_id, user_id
        });

        res.sendStatus(200);

    } catch (error) {
        serverError(error, res);
    }
})

// edit question text
router.patch("/flashcard_question/:flashcard_question_id", Security.authenticateToken, async (req, res) => {
    try {
        let flashcard_question_id = req.params.flashcard_question_id;
        let user_id = req.body.user_data.user_id;
        let { flashcard_question_text, flashcard_question_answer } = req.body;

        if (!Validator.validateFields({ flashcard_question_text, flashcard_question_answer }, res)) {
            return;
        }

        flashcard_question_text = HelperFunction.Ucase(flashcard_question_text);
        flashcard_question_answer = HelperFunction.Ucase(flashcard_question_answer);

        await Thoth_DB.update_data("update flashcard_question set flashcard_question_text=:flashcard_question_text,flashcard_question_answer=:flashcard_question_answer where flashcard_question_id=:flashcard_question_id and user_id=:user_id", { flashcard_question_id, flashcard_question_text, flashcard_question_answer, user_id })

        res.sendStatus(200);

    } catch (error) {
        serverError(error, res);
    }
})


router.delete("/flashcard_question/:flashcard_question_id", Security.authenticateToken, async (req, res) => {
    try {
        let flashcard_question_id = req.params.flashcard_question_id;
        let user_id = req.body.user_data.user_id;

        await Thoth_DB.delete_data("delete from flashcard_question where flashcard_question_id=:flashcard_question_id and user_id=:user_id", { flashcard_question_id, user_id });

        res.sendStatus(200);

    } catch (error) {
        serverError(error, res);
    }
})

module.exports = router;
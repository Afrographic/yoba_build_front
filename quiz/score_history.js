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


router.post("/score_history", Security.authenticateToken, async (req, res) => {
    try {

        let user_id = req.body.user_data.user_id;
        let score_history_created_date = new Date();
        let { score_history_duration, score_history_rank, score_history_score, score_history_total_question, score_history_total_user, quiz_id } = req.body;

        let fields_ok = Validator.validateFields({ score_history_duration, score_history_rank, score_history_score, score_history_total_question, score_history_total_user, quiz_id }, res);
        if (!fields_ok) {
            return;
        }

        await Thoth_DB.post_data("insert into score_history(user_id,score_history_created_date,score_history_duration, score_history_rank, score_history_score, score_history_total_question, score_history_total_user, quiz_id) values(:user_id,:score_history_created_date,:score_history_duration, :score_history_rank, :score_history_score, :score_history_total_question, :score_history_total_user, :quiz_id)", { user_id, score_history_created_date, score_history_duration, score_history_rank, score_history_score, score_history_total_question, score_history_total_user, quiz_id });

        res.sendStatus(200);

    } catch (error) {
        serverError(error, res);
    }
})

router.get("/score_history/quiz/:quiz_id", Security.authenticateToken, async (req, res) => {
    try {

        let user_id = req.body.user_data.user_id;
        let quiz_id = req.params.quiz_id;

        let scores = await Thoth_DB.get_data("select  * from score_history where user_id=:user_id and quiz_id=:quiz_id order by score_history_id DESC limit 31", { user_id, quiz_id });

        for (const score of scores) {
            let index = scores.indexOf(score);
            score.score_history_created_date = HelperFunction.get_elapsed_time(score.score_history_created_date);
            scores[index] = score;
        }



        res.send(scores);

    } catch (error) {
        serverError(error, res);
    }
})


module.exports = router;
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

// post score
router.post("/competition_score", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let competition_score_created_date = new Date();
        let { competition_score_value, competition_score_total, competition_launched_id, competition_subject_id } = req.body;

        if (!Validator.validateFields({ competition_score_value, competition_score_total, competition_launched_id, competition_subject_id }, res)) {
            return;
        }

        competition_score_value = parseInt(competition_score_value);

        await Thoth_DB.post_data("insert into competition_score(competition_score_value,competition_score_total,competition_score_created_date,competition_launched_id,competition_subject_id,user_id) values(:competition_score_value,:competition_score_total,:competition_score_created_date,:competition_launched_id,:competition_subject_id,:user_id)", { competition_score_value, competition_score_total, competition_score_created_date, competition_launched_id, competition_subject_id, user_id });

        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
})

// get competition score
router.get("/competition_score/:competition_launched_id/competition_subject/:competition_subject_id", Security.authenticateToken, async (req, res) => {
    try {
        let competition_subject_id = req.params.competition_subject_id;
        let competition_launched_id = req.params.competition_launched_id;
        let scores = await Thoth_DB.get_data(`select competition_subject_name,user_fullname,user_avatar,user_school,country_name,country_flag,competition_score.* from competition_score,country,user,competition_subject where competition_launched_id=:competition_launched_id and competition_score.user_id=user.user_id and user.country_id = country.country_id and competition_score.competition_subject_id=:competition_subject_id  and competition_subject.competition_subject_id =:competition_subject_id order by competition_score_value DESC`, {
            competition_launched_id, competition_subject_id
        });

        for (let i = 0; i <= scores.length - 1; i++) {
            scores[i].user_avatar = `${Consts.stream_url}${scores[i].user_avatar}`
        }
        res.send(scores);
    } catch (error) {
        serverError(error, res);
    }
})
module.exports = router;
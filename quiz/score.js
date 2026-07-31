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

// Save the score
router.post("/score", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let { score_time_spend, score_value, quiz_id } = req.body;
        let score_created_date = new Date();

        if (!Validator.validateFields({ score_time_spend, score_value, quiz_id }, res)) {
            return;
        }

        try {
            await mark_quiz_as_done(quiz_id, user_id);
        } catch (e) {
            console.log("Ignore it if already saved!");
        }

        await Thoth_DB.post_data("insert into score(score_value,score_time_spend,score_created_date,quiz_id,user_id) values(:score_value,:score_time_spend,:score_created_date,:quiz_id,:user_id)", { score_value, score_time_spend, score_created_date, quiz_id, user_id });

        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
});

async function mark_quiz_as_done(quiz_id, user_id) {
    let quiz_done_created_date = new Date();
    await Thoth_DB.post_data("insert into quiz_done(quiz_id,user_id,quiz_done_created_date) values(:quiz_id,:user_id,:quiz_done_created_date)", { quiz_id, user_id, quiz_done_created_date });
}

// get scores
router.get("/score/quiz/:quiz_id", Security.authenticateToken, async (req, res) => {
    try {
        let quiz_id = req.params.quiz_id;
        let scores = await Thoth_DB.get_data('select distinct user.user_id,user_school,user_avatar,user_fullname,score_value,score_time_spend from score,user where quiz_id=:quiz_id and score.user_id = user.user_id order by score_value ASC', { quiz_id });
        scores = get_best_scores(scores);

        for (let i = 0; i <= scores.length - 1; i++) {
            scores[i].user_avatar = `${Consts.stream_url}${scores[i].user_avatar}`
        }

        res.send(scores);
    } catch (error) {
        serverError(error, res);
    }
})

function get_best_scores(scores) {
    let scores_final = [];
    for (const score of scores) {
        let index = get_score_index(score, scores_final);
        if (index == -1) {
            scores_final.push(score);
        } else {
            if (score.score_value > scores_final[index].score_value) {
                scores_final[index] = score;
            }
        }

    }
    return scores_final;
}

function get_score_index(score, scores) {
    let index = -1;
    for (let i = 0; i <= scores.length - 1; i++) {
        if (scores[i].user_id == score.user_id) {
            index = i;
            break;
        }
    }
    return index;
}


// async function getScoreInfos(scores) {
//     for (const scoreItem of scores) {
//         let index = scores.indexOf(scoreItem);
//         let data = await getScoreInfo(scoreItem.idUser, scoreItem.score);
//         scoreItem.duration = data.duration;
//         scoreItem.dateExo = data.dateExo;
//         scoreItem.rank = index + 1;
//         scoreItem.elapsedTime = services.ComputeElapsedTime(scoreItem.dateExo).trim();
//         scores[index] = scoreItem;
//     }

//     return scores;
// }

// async function getScoreInfo(idUser, score) {
//     let scoreInfo = await Thoth_DB.query("SELECT duration,dateExo from score where idUser=:idUser AND score =:score ", {
//         replacements: {
//             idUser, score
//         },
//         type: Thoth_DB.QueryTypes.SELECT
//     })

//     return scoreInfo[0];
// }


// Get the user historic
// router.get("/quiz/historic/:idUser/:idQuiz", async (req, res) => {
//     try {
//         let idUser = JSON.parse(req.params.idUser);
//         let idQuiz = JSON.parse(req.params.idQuiz);
//         let scores = await Thoth_DB.query(`SELECT score,duration,dateExo as createdAt FROM score 
//                                             WHERE idUser = :idUser AND idExo = :idQuiz
//                                             ORDER BY score DESC`, {
//             replacements: {
//                 idUser, idQuiz
//             },
//             type: Thoth_DB.QueryTypes.SELECT
//         });

//         scores = quizHelper.computeElapsedTime(scores);

//         res.send({
//             status: 200,
//             historic: scores
//         })

//     } catch (error) {
//         serverError(error, res);
//     }
// })

module.exports = router;
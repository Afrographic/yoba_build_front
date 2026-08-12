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

// Mark a quiz as Favourite
router.post("/quiz_favorite", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let { quiz_id } = req.body;

        if (!Validator.validateFields({ quiz_id }, res)) {
            return;
        }

        await Thoth_DB.post_data("insert into quiz_favoris(quiz_id,user_id) values(:quiz_id,:user_id)", { quiz_id, user_id });

        res.sendStatus(200);

    } catch (error) {
        serverError(error, res);
    }
})

router.get("/quiz_favorite_status/quiz/:quiz_id", Security.authenticateToken, async (req, res) => {
    try {
        let quiz_id = JSON.parse(req.params.quiz_id);
        let user_id = req.body.user_data.user_id;

        let quizs = await Thoth_DB.get_data("select * from quiz_favoris where quiz_id=:quiz_id and user_id=:user_id", { quiz_id, user_id });

        res.send({
            is_favorite: quizs.length > 0
        })

    } catch (error) {
        serverError(error, res);
    }
})

router.delete("/quiz_favourite/quiz/:quiz_id", Security.authenticateToken, async (req, res) => {
    try {
        let quiz_id = JSON.parse(req.params.quiz_id);
        let user_id = req.body.user_data.user_id;

        await Thoth_DB.delete_data("delete from quiz_favoris where quiz_id=:quiz_id and user_id=:user_id", { quiz_id, user_id });

        res.sendStatus(200);

    } catch (error) {
        serverError(error, res);
    }
})

// Get the favourites quiz of a given user
router.get("/quiz_favoris/offset/:offset", Security.authenticateToken, async (req, res) => {
    try {
        let offset = parseInt(req.params.offset);
        let limit = 10;
        let user_id = req.body.user_data.user_id;
        let quiz_ids = await Thoth_DB.get_data("select quiz_id from quiz_favoris where user_id=:user_id order by quiz_favoris_id DESC  limit :limit offset :offset", { user_id, offset, limit });

        let quizs = [];

        for (const quiz of quiz_ids) {
            let quiz_item = await Model_Helper.get_quiz_item(quiz.quiz_id);
            quizs.push(quiz_item)
        }

        res.send(quizs);

    } catch (error) {
        serverError(error, res);
    }
})

// get total user fav quiz
router.get("/total_fav_quiz", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let total = await Thoth_DB.get_data("select count(*) as total from quiz_favoris where user_id=:user_id", { user_id });
        res.send({ total: parseInt(total[0].total) });
    } catch (error) {
        serverError(error, res);
    }
})

module.exports = router;
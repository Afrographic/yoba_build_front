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
const { Model_Helper } = require("../../utils/model_helper.js");
const { Quiz_Controller } = require("../../controllers/quiz_controller.js");
const { Drive_Service } = require("../../services/drive/drive.js");

router.post("/competition_subject", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let competition_subject_created_date = new Date();
        let { quiz_consigne, quiz_duration, competition_subject_name, competition_id } = req.body;
        let quiz_image = "";

        let fields_ok = Validator.validateFields({ quiz_consigne, quiz_duration, competition_subject_name, competition_id }, res);
        if (!fields_ok) return;

        if (!(await OwnerShipChecker.check("competition", competition_id, user_id))) {
            return res.sendStatus(401);
        }

        competition_subject_name = HelperFunction.Ucase(competition_subject_name);

        if (Validator.valid_image_upload(req)) {
            quiz_image = await Drive_Service.upload_file(req.files.file.name, req.files.file.data)
        }

        let quiz_id = await create_competition_subject_quiz(quiz_consigne, quiz_duration, quiz_image, user_id);
        let competition_subject = await Thoth_DB.post_data("insert into competition_subject(competition_subject_name,competition_subject_created_date,quiz_id,competition_id,user_id) values(:competition_subject_name,:competition_subject_created_date,:quiz_id,:competition_id,:user_id)", { competition_subject_name, competition_subject_created_date, quiz_id, competition_id, user_id });

        res.send({ quiz_id: quiz_id, competition_subject_id: competition_subject[0] });

    } catch (error) {
        serverError(error, res);
    }
})

async function create_competition_subject_quiz(quiz_consigne, quiz_duration, quiz_image, user_id) {
    let quiz_created_date = new Date();
    let quizs = await Thoth_DB.post_data("insert into quiz(quiz_consigne,quiz_duration,quiz_image,quiz_created_date,user_id) values (:quiz_consigne,:quiz_duration,:quiz_image,:quiz_created_date,:user_id) ", { quiz_consigne, quiz_duration, quiz_image, quiz_created_date, user_id });
    return quizs[0];
}

// get competition subjects
router.get("/competition_subjects/:competition_id", Security.authenticateToken, async (req, res) => {
    try {
        let competition_id = req.params.competition_id;
        let competition_subjects = await Thoth_DB.get_data("select * from competition_subject where competition_id=:competition_id", { competition_id });
        //  get total questions
        for (const competition_subject of competition_subjects) {
            let index = competition_subjects.indexOf(competition_subject);
            // get total questions
            let axios_res = await Model_Helper.get_total_question(competition_subject.quiz_id);
            competition_subjects[index].total_question = axios_res.total;
            // get quiz object
            axios_res = await Model_Helper.get_subjects_quiz(competition_subject.quiz_id);

            competition_subjects[index].quiz = axios_res;
        }
        console.log(competition_subjects);
        res.send(competition_subjects);
    } catch (error) {
        serverError(error, res);
    }
})


// Edit competition subject name
router.patch("/competition_subject_name/:competition_subject_id", Security.authenticateToken, async (req, res) => {
    try {
        let competition_subject_id = req.params.competition_subject_id;
        let user_id = req.body.user_data.user_id;
        let competition_subject_name = req.body.competition_subject_name ?? "";

        if (competition_subject_name.trim().length == 0) {
            return res.sendStatus(401);
        }

        competition_subject_name = HelperFunction.Ucase(competition_subject_name);

        let data = await Thoth_DB.update_data("update competition_subject set competition_subject_name=:competition_subject_name where competition_subject_id = :competition_subject_id and user_id=:user_id ", { competition_subject_name, competition_subject_id, user_id });

        if (data[0].affectedRows == 0) {
            return res.sendStatus(401);
        }
        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
})

// delete competition subject
router.delete("/competition_subject/:competition_subject_id", Security.authenticateToken, async (req, res) => {
    try {
        let competition_subject_id = req.params.competition_subject_id;
        let user_id = req.body.user_data.user_id;

        if (!(await OwnerShipChecker.check("competition_subject", competition_subject_id, user_id))) {
            return res.sendStatus(401);
        }

        await delete_competition_subject_quiz(competition_subject_id, req.body.token, user_id);

        await Thoth_DB.delete_data("delete from competition_subject where competition_subject_id=:competition_subject_id and user_id=:user_id", { competition_subject_id, user_id });

        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
})

async function delete_competition_subject_quiz(competition_subject_id, token, user_id) {
    let competition_subject = await Thoth_DB.get_data("select quiz_id from competition_subject  where competition_subject_id=:competition_subject_id", { competition_subject_id });
    let quiz_id = competition_subject[0].quiz_id;
    await Quiz_Controller.delete_quiz(quiz_id, user_id);
}

module.exports = router;
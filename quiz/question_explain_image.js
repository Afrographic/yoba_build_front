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
const { Question_Explain_Image_Controller } = require("../../controllers/question_explain_controller.js");
const { Drive_Service } = require("../../services/drive/drive.js");

// add image explanation

router.post("/explain_image", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let question_explain_image_created_date = new Date();
        let { question_id } = req.body;

        if (!Validator.valid_file_upload(req)) {
            res.sendStatus(401);
            return;
        }

        if (!Validator.validateFields({ question_id }, res)) {
            return;
        }

        if (!(await OwnerShipChecker.is_question_owner(question_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        let question_explain_image_url = await Drive_Service.upload_file(req.files.file.name, req.files.file.data)
        let question_explain_image_size = req.files.file.size;

        await Thoth_DB.post_data("insert into question_explain_image(question_explain_image_url,question_explain_image_size,question_explain_image_created_date,question_id,user_id) values(:question_explain_image_url,:question_explain_image_size,:question_explain_image_created_date,:question_id,:user_id)", { question_explain_image_url, question_explain_image_size, question_explain_image_created_date, question_id, user_id });

        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
})

// delete explanation images of a question
router.delete("/explain_image/question/:question_id", Security.authenticateToken, async (req, res) => {
    try {
        let question_id = req.params.question_id;
        // get the explain images
        let images = await Question_Explain_Image_Controller.get_explain_images(question_id);

        for (const image of images) {
            await Question_Explain_Image_Controller.delete_question_explain_image(image.question_explain_image_id);

        }
        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
})


// delete single image explanation
router.delete("/question_explain_image/:question_explain_image_id", Security.authenticateToken, async (req, res) => {
    try {
        let question_explain_image_id = req.params.question_explain_image_id;
        let user_id = req.body.user_data.user_id;

        Question_Explain_Image_Controller.delete_question_explain_image(question_explain_image_id, user_id);

        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
})


// get question image explain
router.get("/explain_image/question/:question_id", Security.authenticateToken, async (req, res) => {
    try {
        let question_id = req.params.question_id;
        let images = await Thoth_DB.get_data("select * from question_explain_image where question_id=:question_id", { question_id });
        for (let i = 0; i <= images.length - 1; i++) {
            images[i].question_explain_image_url = `${Consts.stream_url}${images[i].question_explain_image_url}`
        }
        res.send(images);
    } catch (error) {
        serverError(error, res);
    }
})

// get question image explain urls
router.get("/explain_image_url/question/:question_id", Security.authenticateToken, async (req, res) => {
    try {
        let question_id = req.params.question_id;
        let response = [];
        let images = await Thoth_DB.get_data("select question_explain_image_url from question_explain_image where question_id=:question_id", { question_id });
        for (const image of images) {
            response.push(`${Consts.stream_url}${image.question_explain_image_url}`);
        }
        res.send(response);
    } catch (error) {
        serverError(error, res);
    }
})
module.exports = router;
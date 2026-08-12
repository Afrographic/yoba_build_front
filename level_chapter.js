const express = require("express");
const router = express.Router();

const { Security } = require("../utils/security");
const { Validator } = require("../utils/validator");
const { HelperFunction } = require("../utils/helper_function");
const { HelperFile } = require("../utils/helper_file.js");
const { OwnerShipChecker } = require("../utils/ownership_checker.js");
const { Consts } = require("../consts.js");
const { Thoth_DB } = require("../thoth_db");
const { serverError } = require("../utils/server_error.js");
const { Chapter_Controller } = require("../controllers/chapter_controller.js");

router.post("/chapter", Security.authenticateToken, async (req, res) => {
    try {
        let { chapter_name, subject_id,room_id } = req.body;
        let field_ok = Validator.validateFields({ chapter_name, subject_id }, res);
        if (!field_ok) {
            return;
        }

        let chapter_created_date = new Date();
        let user_id = req.body.user_data.user_id;

        chapter_name = HelperFunction.Ucase(chapter_name);
        await Thoth_DB.post_data("INSERT INTO chapter(room_id,chapter_name,subject_id,chapter_created_date,user_id) VALUES(:room_id,:chapter_name,:subject_id,:chapter_created_date,:user_id)", { room_id,chapter_name, subject_id, chapter_created_date, user_id })

        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
})

// edit chapter name
router.patch("/name/chapter/:chapter_id", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let chapter_id = req.body.chapter_id;

        if (!(await OwnerShipChecker.is_chapter_owner(chapter_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        let { chapter_name } = req.body;
        let field_ok = Validator.validateFields({ chapter_name });
        if (!field_ok) {
            return;
        }

        chapter_name = HelperFunction.Ucase(chapter_name);
        await Thoth_DB.update_data("update chapter set chapter_name=:chapter_name", { chapter_name });
        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
})

// delete a chapter
router.delete("/chapter/:chapter_id", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let chapter_id = req.params.chapter_id;

        if (!(await OwnerShipChecker.is_chapter_owner(chapter_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        await Thoth_DB.delete_data("delete from chapter where chapter_id=:chapter_id", { chapter_id });
        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
})


// Get all the chapters of a subjects
router.get("/chapter/subject/:subject_id", Security.authenticateToken, async (req, res) => {
    try {
        let subject_id = req.params.subject_id;
        let chapters = await Thoth_DB.get_data("SELECT * FROM chapter WHERE subject_id=:subject_id", { subject_id });
        chapters = await Chapter_Controller.get_meta_data(chapters);
        res.send(chapters);
    } catch (error) {
        serverError(error, res);
    }
})


// count all the quizes of a chapter
router.get("/count_quiz/chapter/:chapter_id", Security.authenticateToken, async (req, res) => {
    try {
        let chapter_id = parseInt(req.params.chapter_id);

        let total = await Chapter_Controller.count_quiz(chapter_id);

        res.send({
            total
        })
    } catch (error) {
        serverError(error, res);
    }
})

// count all the flashcards of a chapter

router.get("/count_flashcard/chapter/:chapter_id", Security.authenticateToken, async (req, res) => {
    try {
        let chapter_id = parseInt(req.params.chapter_id);

        let total = await Chapter_Controller.count_flashcard(chapter_id);

        res.send({ total })
    } catch (error) {
        serverError(error, res);
    }
})



// edit chapter name
router.patch("/chapter/:chapter_id", Security.authenticateToken, async (req, res) => {
    try {
        let chapter_id = parseInt(req.params.chapter_id);
        let user_id = req.body.user_data.user_id;
        let { chapter_name } = req.body;
        let allFieldsOk = Validator.validateFields({ chapter_name }, res);
        if (!allFieldsOk) {
            return;
        }



        chapter_name = HelperFunction.Ucase(chapter_name);
        await Thoth_DB.update_data("update chapter set chapter_name=:chapter_name where chapter_id=:chapter_id and user_id=:user_id", { chapter_name, chapter_id, user_id })

        res.sendStatus(200);

    } catch (error) {
        serverError(error, res);
    }
})



// delete a chapter

router.delete("/chapter/:chapter_id", Security.authenticateToken, async (req, res) => {
    try {
        let chapter_id = parseInt(req.params.chapter_id);
        let user_id = req.body.user_data.user_id;

        await Thoth_DB.delete_data("delete from chapter where chapter_id=:chapter_id and user_id=:user_id", { chapter_id, user_id })
        res.sendStatus(200);

    } catch (error) {
        serverError(error, res);
    }
})

module.exports = router;
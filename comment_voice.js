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
const { Drive_Service } = require("../services/drive/drive.js");

// here we create the comment and append the voice directly
// so one voice at time per user
router.post("/comment_voice", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let { comment_id, comment_voice_duration } = req.body;
        let comment_voice_created_date = new Date();

        if (!Validator.validateFields({ comment_id, comment_voice_duration }, res)) {
            return;
        }

        if (!Validator.valid_voice_upload(req)) {
            res.sendStatus(401);
            return;
        }

        if (!(await OwnerShipChecker.check("comment", comment_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        let comment_voice_url = await Drive_Service.upload_file(req.files.file.name, req.files.file.data);

        await Thoth_DB.post_data("insert into comment_voice(comment_id,comment_voice_url,comment_voice_duration,comment_voice_created_date,user_id) values(:comment_id,:comment_voice_url,:comment_voice_duration,:comment_voice_created_date,:user_id)", { comment_id, comment_voice_url, comment_voice_duration, comment_voice_created_date, user_id });

        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
})



// get voice comment
router.get("/comment_voice/:comment_id", Security.authenticateToken, async (req, res) => {
    try {
        let comment_id = req.params.comment_id;
        let comment_voices = await Thoth_DB.get_data("select * from comment_voice where comment_id=:comment_id", { comment_id });
        for (let i = 0; i <= comment_voices.length - 1; i++) {
            comment_voices[i].comment_voice_url = `${Consts.stream_url}${comment_voices[i].comment_voice_url}`;
        }
        res.send(comment_voices);
    } catch (error) {
        serverError(error, res);
    }
})


// delete comment voice
router.delete("/comment_voice/:comment_voice_id", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let comment_voice_id = req.params.comment_voice_id;

        if (!(await OwnerShipChecker.check("comment_voice", comment_voice_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        await HelperFunction.delete_db_file("private", "comment_voice", "comment_voice_url", "comment_voice_id", comment_voice_id);

        await Thoth_DB.delete_data("delete from comment_voice where comment_voice_id=:comment_voice_id and user_id=:user_id", { comment_voice_id, user_id });

        res.sendStatus(200);

    } catch (error) {
        serverError(error, res);
    }
})

module.exports = router;




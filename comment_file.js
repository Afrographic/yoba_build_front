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
router.post("/comment_file", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let { comment_id } = req.body;
        let comment_file_created_date = new Date();

        if (!Validator.validateFields({ comment_id }, res)) {
            return;
        }

        if (!Validator.valid_file_upload(req)) {
            res.sendStatus(401);
            return;
        }

        if (!(await OwnerShipChecker.check("comment", comment_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        let comment_file_url = await Drive_Service.upload_file(req.files.file.name, req.files.file.data);
        let comment_file_size = req.files.file.size;
        let comment_file_name = req.files.file.name;

        await Thoth_DB.post_data("insert into comment_file(comment_id,comment_file_url,comment_file_size,comment_file_name,comment_file_created_date,user_id) values(:comment_id,:comment_file_url,:comment_file_size,:comment_file_name,:comment_file_created_date,:user_id)", { comment_id, comment_file_url, comment_file_size, comment_file_name, comment_file_created_date, user_id });

        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
})


// get files comments
router.get("/comment_file/:comment_id", Security.authenticateToken, async (req, res) => {
    try {
        let comment_id = req.params.comment_id;
        let comment_files = await Thoth_DB.get_data("select * from comment_file where comment_id=:comment_id", { comment_id });
        for (let i = 0; i <= comment_files.length - 1; i++) {
            comment_files[i].comment_file_url = `${Consts.stream_url}${comment_files[i].comment_file_url}`
        }
        res.send(comment_files);
    } catch (error) {
        serverError(error, res);
    }
})



// delete comment file
router.delete("/comment_file/:comment_file_id", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let comment_file_id = req.params.comment_file_id;

        if (!(await OwnerShipChecker.check("comment_file", comment_file_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        await HelperFunction.delete_db_file("private", "comment_file", "comment_file_url", "comment_file_id", comment_file_id);

        await Thoth_DB.delete_data("delete from comment_file where comment_file_id=:comment_file_id and user_id=:user_id", { comment_file_id, user_id });

        res.sendStatus(200);

    } catch (error) {
        serverError(error, res);
    }
})


module.exports = router;




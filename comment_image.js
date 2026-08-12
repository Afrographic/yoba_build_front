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
const { Comment_Image_Controller } = require("../controllers/comment_image_controller.js");

// add image to comment
router.post("/comment_image", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let comment_image_created_date = new Date();
        let { comment_id } = req.body;

        if (!Validator.valid_image_upload(req)) {
            res.sendStatus(401);
            return;
        }

        if (!Validator.validateFields({ comment_id }, res)) {
            return;
        }

        if (!(await OwnerShipChecker.check("comment", comment_id, user_id))) {
            res.sendStatus(401);
            return;
        }


        let comment_image_url = await Drive_Service.upload_file(req.files.file.name, req.files.file.data)
        let comment_image_size = req.files.file.size;

        await Thoth_DB.post_data("insert into comment_image(comment_id,comment_image_url,comment_image_size,comment_image_created_date,user_id) values(:comment_id,:comment_image_url,:comment_image_size,:comment_image_created_date,:user_id)", { comment_id, comment_image_url, comment_image_size, comment_image_created_date, user_id });

        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
});


// get all the images of a comment
router.get("/comment_image/:comment_id", Security.authenticateToken, async (req, res) => {
    try {
        let comment_id = req.params.comment_id;
        let images = [];
        let comment_images = await Thoth_DB.get_data("select comment_image_url from comment_image where comment_id=:comment_id", { comment_id });
        for (const image of comment_images) {
            images.push(`${Consts.stream_url}${image.comment_image_url}`);
        }
        res.send(images);
    } catch (error) {
        serverError(error, res);
    }
})

// delete comment image
router.delete("/comment_image/:comment_image_id", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let comment_image_id = req.params.comment_image_id;

        if (!(await OwnerShipChecker.check("comment_image", comment_image_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        await Comment_Image_Controller.delete(comment_image_id);

        await Thoth_DB.delete_data("delete from comment_image where comment_image_id=:comment_image_id and user_id=:user_id", { comment_image_id, user_id });

        res.sendStatus(200);

    } catch (error) {
        serverError(error, res);
    }
})



module.exports = router;
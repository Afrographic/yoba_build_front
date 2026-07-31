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
const { Drive_Service } = require("../../services/drive/drive.js");

// Post homework correction

router.post("/home_work_correction", Security.authenticateToken, async (req, res) => {
    try {
        let created_date = new Date();
        let user_id = req.body.user_data.user_id;
        let home_work_id = req.body.home_work_id ?? 0;

        if (home_work_id == 0) return res.sendStatus(400);

        if (!(await OwnerShipChecker.check("home_work", home_work_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        await delete_existing_correction_if_any(home_work_id);

        let data = await Thoth_DB.post_data("insert into home_work_correction(home_work_id,user_id,created_date) values(:home_work_id,:user_id,:created_date)", { home_work_id, user_id, created_date });

        res.send({ home_work_correction_id: data[0] });

    } catch (error) {
        serverError(error, res);
    }
})


async function delete_existing_correction_if_any(home_work_id) {
    let home_work_corrections = await Thoth_DB.get_data("select * from home_work_correction where home_work_id=:home_work_id", { home_work_id });
    if (home_work_corrections.length == 0) return;
    let home_work_correction = home_work_corrections[0];
    await delete_db_files(home_work_correction);
    await delete_db_images(home_work_correction);
    await Thoth_DB.delete_data(`delete from home_work_correction where home_work_correction_id=${home_work_correction.home_work_correction_id}`, {})
}

async function delete_db_files(home_work_correction) {
    let files = await Thoth_DB.get_data(`select * from home_work_correction_file where home_work_correction_id = ${home_work_correction.home_work_correction_id}`);

    for (const file of files) {
        await HelperFunction.delete_db_file("public/homeWork/files", "home_work_correction_file", "home_work_correction_file_url", "home_work_correction_file_id", file.home_work_correction_file_id);
    }

}

async function delete_db_images(home_work_correction) {
    let images = await Thoth_DB.get_data(`select * from home_work_correction_image where home_work_correction_id = ${home_work_correction.home_work_correction_id}`);

    for (const image of images) {
        await HelperFunction.delete_db_file("public/homeWork/images", "home_work_correction_image", "home_work_correction_image_url", "home_work_correction_image_id", image.home_work_correction_image_id);
    }

}



// add image to a new
router.post("/home_work_correction_image", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let home_work_correction_id = req.body.home_work_correction_id ?? 0;

        if (home_work_correction_id == 0) {
            return res.sendStatus(400);
        }

        if (!(await OwnerShipChecker.check("home_work_correction", home_work_correction_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        if (!(Validator.valid_image_upload(req))) {
            res.sendStatus(401);
            return;
        }

        let home_work_correction_image_url = await Drive_Service.upload_file(req.files.file.name, req.files.file.data);

        await Thoth_DB.post_data("insert into home_work_correction_image(home_work_correction_image_url,home_work_correction_id,user_id) values(:home_work_correction_image_url,:home_work_correction_id,:user_id)", { home_work_correction_image_url, home_work_correction_id, user_id });

        res.sendStatus(200);

    } catch (error) {
        serverError(error, res);
    }
})

// add file to a new
router.post("/home_work_correction_file", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let home_work_correction_id = req.body.home_work_correction_id ?? 0;

        if (home_work_correction_id == 0) {
            return res.sendStatus(400);
        }

        if (!(await OwnerShipChecker.check("home_work_correction", home_work_correction_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        if (!(Validator.valid_image_upload(req))) {
            res.sendStatus(401);
            return;
        }

        let home_work_correction_file_url = await Drive_Service.upload_file(req.files.file.name, req.files.file.data);

        await Thoth_DB.post_data("insert into home_work_correction_file(home_work_correction_file_url,home_work_correction_id,user_id) values(:home_work_correction_file_url,:home_work_correction_id,:user_id)", { home_work_correction_file_url, home_work_correction_id, user_id });

        res.sendStatus(200);

    } catch (error) {
        serverError(error, res);
    }
})


// Get homework correction

router.get("/home_work_correction/:home_work_id", Security.authenticateToken, async (req, res) => {
    try {

        let home_work_id = req.params.home_work_id;

        let home_work_corrections = await Thoth_DB.get_data("select * from home_work_correction where home_work_id=:home_work_id", { home_work_id });


        if (home_work_corrections.length == 0) return res.sendStatus(404);

        let home_work_correction_item = home_work_corrections[0];

        home_work_correction_item = await get_extra_data(home_work_correction_item);

        res.send(home_work_correction_item);

    } catch (error) {
        serverError(error, res);
    }

});

async function get_extra_data(home_correction_item) {
    home_correction_item.files_urls = await get_files(home_correction_item);
    home_correction_item.images_urls = await get_images(home_correction_item);
    return home_correction_item;
}

async function get_files(home_work_item) {
    try {

        let files = await Thoth_DB.get_data(`select * from home_work_correction_file where home_work_correction_id=${home_work_item.home_work_correction_id}`);
        let returner = [];

        for (const item of files) {
            let url = `${Consts.stream_url}${item.home_work_correction_file_url}`;
            returner.push(url);
        }

        return returner;
    } catch (error) {
        console.log(error);
        return [];
    }
}

async function get_images(home_work_item) {
    try {
        let images = await Thoth_DB.get_data(`select * from home_work_correction_image where home_work_correction_id=${home_work_item.home_work_correction_id}`);
        let returner = [];
        for (const item of images) {
            let url = `${Consts.stream_url}${item.home_work_correction_image_url}`;
            returner.push(url);
        }
        return returner;
    } catch (error) {
        console.log(error);
        return [];
    }
}


module.exports = router;
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


router.post("/lib", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let lib_created_date = new Date();
        let { room_id, lib_description, lib_context_id } = req.body;


        let fields_ok = Validator.validateFields({ room_id, lib_description, lib_context_id }, res);
        if (!fields_ok) {
            return;
        }

        if (!(await OwnerShipChecker.is_room_admin(room_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        if (!Validator.valid_file_upload(req)) {
            res.sendStatus(401);
            return;
        }

        let lib_file_name = req.files.file.name;
        lib_description = HelperFunction.Ucase(lib_description);
        let lib_file_url = await Drive_Service.upload_file(req.files.file.name, req.files.file.data);
        let size = req.files.file.size;

        let file;
        if (lib_context_id == 0) {
            console.log(lib_file_name);
            file = await Thoth_DB.post_data("insert into lib(lib_description,lib_file_url,lib_file_name,lib_created_date,room_id,user_id,size) values(:lib_description,:lib_file_url,:lib_file_name,:lib_created_date,:room_id,:user_id,:size)", {
                lib_description, lib_file_url, lib_file_name, lib_created_date, room_id, user_id, size
            });
        }

        if (lib_context_id != 0) {
            file = await Thoth_DB.post_data("insert into lib(lib_description,lib_file_url,lib_file_name,lib_created_date,size,room_id,user_id,lib_context_id) values(:lib_description,:lib_file_url,:lib_file_name,:lib_created_date,:size,:room_id,:user_id,:lib_context_id)", {
                lib_description, lib_file_url, lib_file_name, lib_created_date, size, room_id, user_id, lib_context_id
            });
        }


        res.send({ lib_id: file[0], lib_file_url: `${Consts.stream_url}${lib_file_url}` });

    } catch (error) {
        serverError(error, res);
    }
})




// edit lib description
router.patch("/description/lib/:lib_id", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let lib_id = req.params.lib_id;

        if (!(await OwnerShipChecker.is_lib_owner(lib_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        let { lib_description } = req.body;
        let field_ok = Validator.validateFields({ lib_description }, res);
        if (!field_ok) {
            return;
        }

        lib_description = HelperFunction.Ucase(lib_description);
        await Thoth_DB.update_data("update lib set lib_description=:lib_description where lib_id=:lib_id and user_id=:user_id", { lib_description, lib_id, user_id });

        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
})

// get the files from lib
router.get("/lib/room/:room_id/:offset", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let room_id = req.params.room_id;
        let offset = parseInt(req.params.offset);
        let limit = 10;

        if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        let libs = await Thoth_DB.get_data("select * from lib where room_id=:room_id order by lib_id DESC limit :limit offset :offset", { room_id, limit, offset });

        libs = add_stream_url(libs);

        res.send(libs);
    } catch (error) {
        serverError(error, res);
    }
});

// get the root files
router.get("/root_files/room/:room_id/offset/:offset", Security.authenticateToken, async (req, res) => {
    try {
        let offset = parseInt(req.params.offset);
        let limit = 10;
        let room_id = req.params.room_id;
        let user_id = req.body.user_data.user_id;

        if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        let files = await Thoth_DB.get_data("select lib.*,user_avatar,user_fullname from lib,user where lib_context_id is null and lib.user_id = user.user_id and room_id =:room_id order by lib_id DESC limit :limit offset :offset", {
            limit, offset, room_id
        })

        files = add_stream_url(files);

        res.send(files);

    } catch (error) {
        serverError(error, res);
    }
})


// count total files on the root
router.get("/total_root_files/room/:room_id", Security.authenticateToken, async (req, res) => {
    try {
        let room_id = req.params.room_id;
        let user_id = req.body.user_data.user_id;

        if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        let total = await Thoth_DB.get_data("select count(*) as total from lib where lib_context_id is null and room_id =:room_id", { room_id });
        res.send({ total: parseInt(total[0].total) });
    } catch (error) {
        serverError(error, res);
    }
})



// Search in lib
router.get("/search_lib/:token/room/:room_id", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let room_id = req.params.room_id;
        let token = req.params.token;

        if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        let libs = await Thoth_DB.get_data(`select user_avatar,user_fullname,lib.* from lib,user where room_id = ${room_id} and user.user_id = lib.user_id and  (lib_description like '%${token}%' or lib_file_name like '%${token}%')   order by lib_id DESC`);

        libs = add_stream_url(libs);

        res.send(libs);
    } catch (error) {
        serverError(error, res);
    }
})

function add_stream_url(libs) {
    for (let i = 0; i <= libs.length - 1; i++) {
        libs[i].lib_file_url = `${Consts.stream_url}${libs[i].lib_file_url}`;
        libs[i].user_avatar = `${Consts.stream_url}${libs[i].user_avatar}`;
    }
    return libs;
}



// delete a lib item
router.delete("/lib/:lib_id/room/:room_id", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let lib_id = req.params.lib_id;
        let room_id = req.params.room_id;

        if (!(await OwnerShipChecker.is_room_admin(room_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        await delete_lib_file(lib_id);
        await Thoth_DB.delete_data("delete from lib where lib_id=:lib_id", { lib_id });
        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
})

async function delete_lib_file(lib_id) {
    let libs = await Thoth_DB.get_data("select * from lib where lib_id=:lib_id", { lib_id });
    if (libs.length == 0) return;
    Drive_Service.delete_file(libs[0].lib_file_url);
}


// count the total numbers of files in the room
router.get("/count_lib/room/:room_id", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let room_id = req.params.room_id;

        if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        let total = await Thoth_DB.get_data("select count(*) as total from lib where room_id=:room_id", { room_id });

        res.send({ total: parseInt(total[0].total) });
    } catch (error) {
        serverError(error, res);
    }
})

module.exports = router;
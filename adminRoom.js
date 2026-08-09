const express = require("express");
const router = express.Router();

const { Security } = require("../utils/security");
const { Validator } = require("../utils/validator");
const { HelperFunction } = require("../utils/helper_function");
const { HelperFile } = require("../utils/helper_file.js");
const { OwnerShipChecker } = require("../utils/ownership_checker.js");
const { Consts } = require("../consts.js");
const { serverError } = require("../utils/server_error.js");
const { Thoth_DB } = require("../thoth_db.js");


//  Add admin priviledge
router.post("/room_admin", [Security.authenticateToken, Security.is_room_owner], async (req, res) => {
    try {

        let room_admin_created_date = new Date();
        let { room_id, user_id } = req.body;

        if (!Validator.validateFields({ room_id, user_id }, res)) {
            return;
        }

        await Thoth_DB.post_data("insert into room_admin(user_id,room_id,room_admin_created_date) values(:user_id,:room_id,:room_admin_created_date)", { user_id, room_id, room_admin_created_date });

        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }

})

// Remove admin priviledge

router.post("/room_admin/user/:user_id/room/:room_id", [Security.authenticateToken, Security.is_room_owner], async (req, res) => {
    try {
        let user_id = req.params.user_id;
        let room_id = req.params.room_id;

        console.log(room_id);

        await Thoth_DB.delete_data("delete from room_admin where user_id=:user_id and room_id=:room_id", { user_id, room_id });

        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }

})

router.get("/is_admin/user/:user_id/room/:room_id", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.params.user_id;
        let room_id = req.params.room_id;

        let data = await Thoth_DB.get_data('select * from room_admin where user_id=:user_id and room_id=:room_id', { user_id, room_id });

        res.send({ is_admin: data.length > 0 });
    } catch (error) {
        serverError(error, res);
    }
})



module.exports = router;

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
const Axios_Private = require("../utils/axios");
const { Model_Helper } = require("../utils/model_helper.js");
const { User_Controller } = require("../controllers/user_controller.js");

// add a user to a room
router.post("/user_room", Security.authenticateToken, async (req, res) => {
    try {
        let admin_id = req.body.user_data.user_id;
        let user_room_created_date = new Date();
        let { room_id, user_id } = req.body;

        let fields_ok = Validator.validateFields({ room_id, user_id });
        if (!fields_ok) {
            return;
        }

        if (admin_id == user_id) {
            res.sendStatus(401);
            return;
        }

        if (!(await OwnerShipChecker.is_room_admin(room_id, admin_id))) {
            res.sendStatus(401);
            return;
        }

        let user_in_room = await User_Controller.is_in_room(user_id, room_id);
        if (user_in_room) {
            return res.sendStatus(401);
        }

        await Thoth_DB.post_data("insert into user_room(room_id,user_id,user_room_created_date) values(:room_id,:user_id,:user_room_created_date)", {
            room_id, user_id, user_room_created_date
        })

        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
})

// remove a user from a room
router.delete("/user_room/user/:user_id/room/:room_id", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.params.user_id;
        let admin_id = req.body.user_data.user_id;
        let room_id = req.params.room_id;

        let fields_ok = Validator.validateFields({ room_id, user_id });
        if (!fields_ok) {
            return;
        }

        if (!(await OwnerShipChecker.is_room_admin(room_id, admin_id))) {
            res.sendStatus(401);
            return;
        }

        // il ne doit pas retirer un autre administrateur

        if ((await OwnerShipChecker.is_room_admin(room_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        if (admin_id == user_id) {
            res.sendStatus(401);
            return;
        }

        await Thoth_DB.delete_data("delete from user_room where room_id=:room_id and user_id=:user_id", { room_id, user_id });
        res.sendStatus(200);
    } catch (error) {
        serverError(error, res);
    }
})

// get rooms of a user
router.get("/user_room", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let rooms_ids = await Thoth_DB.get_data("select * from user_room where user_room.user_id = :user_id", { user_id });
        let rooms = [];
        for (const item of rooms_ids) {
            let room_item = await Model_Helper.get_room_data(item.room_id,user_id);
            room_item.expired = item.expired;
            room_item.expired_at = item.expired_at;
            rooms.push(room_item);
            //check if expired
        }
        res.send(rooms);
    } catch (error) {
        serverError(error, res);
    }
})

module.exports = router;
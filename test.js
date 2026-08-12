const express = require("express");
const { Thoth_DB } = require("../thoth_db");
const { HelperFunction } = require("../utils/helper_function");
const { OwnerShipChecker } = require("../utils/ownership_checker");
const { Security } = require("../utils/security");
const { serverError } = require("../utils/server_error");
const { Validator } = require("../utils/validator");
const router = express.Router();


// create a test
router.post("/test", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let { test_name, room_id, quiz_id } = req.body;
        let test_created_date = new Date();
        let fields_ok = Validator.validateFields({ test_name, room_id, quiz_id }, res);
        if (!fields_ok) {
            return;
        }

        if (!(await OwnerShipChecker.is_room_admin(room_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        if (!(await OwnerShipChecker.is_quiz_owner(quiz_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        await Thoth_DB.post_data("insert into test(test_name,room_id,quiz_id,user_id,test_created_date) values(:test_name,:room_id,:quiz_id,:user_id,:test_created_date)", {
            test_name, room_id, quiz_id, user_id, test_created_date
        })

        res.sendStatus(200);

    } catch (error) {
        serverError(error, res);
    }
})

// Create a test quiz
router.post("/quiz_test", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let { quiz_consigne, quiz_duration } = req.body;
        let quiz_is_test = 1;
        let quiz_created_date = new Date();
        let fields_ok = Validator.validateFields({ quiz_consigne, quiz_duration }, res);
        if (!fields_ok) {
            return;
        }

        if (parseInt(quiz_duration) == 0) {
            res.status(401).send("The duration cannot be null")
            return;
        }

        quiz_consigne = HelperFunction.Ucase(quiz_consigne);

        let data = await Thoth_DB.post_data("insert into quiz(quiz_consigne,quiz_duration,quiz_created_date,quiz_is_test,user_id) values(:quiz_consigne,:quiz_duration,:quiz_created_date,:quiz_is_test,:user_id)", {
            quiz_consigne, quiz_duration, quiz_created_date, quiz_is_test, user_id
        })

        let quiz_id = data[0];

        res.send({ quiz_id });
    } catch (error) {
        serverError(error, res);
    }
})



router.post("/launch_test", Security.authenticateToken, async (req, res) => {
    let user_id = req.body.user_data.user_id;
    let test_ongoing_created_date = new Date();
    let { test_id, room_id } = req.body;
    let fields_ok = Validator.validateFields({ test_id, room_id }, res);
    if (!fields_ok) {
        return;
    }

    if (!(await OwnerShipChecker.is_test_owner(test_id, user_id))) {
        res.sendStatus(401);
        return;
    }

    if (!(await OwnerShipChecker.is_room_admin(room_id, user_id))) {
        res.sendStatus(401);
        return;
    }

    let test_ongoing = await Thoth_DB.post_data("insert into test_ongoing(test_ongoing_created_date,test_id,room_id) values(:test_ongoing_created_date,:test_id,;room_id)", {
        test_ongoing_created_date, test_id, room_id
    })

    let test_ongoing_id = test_ongoing[0];
    end_test(test_id, test_ongoing_id, room_id);

    res.send({ launched: true });

})

async function end_test(test_id, test_ongoing_id, room_id) {
    let quiz_duration = get_test_duration(test_id);
    setTimeout(async function () {
        await Thoth_DB.delete_data("delete * from test_ongoing where test_ongoing_id=:test_ongoing_id", { test_ongoing_id });
        let test_over_created_date = new Date();
        await Thoth_DB.post_data("insert into test_over(test_over_created_date,test_id,room_id) values(:test_over_created_date,:test_id,:room_id)", { test_over_created_date, test_id, room_id });
    }, quiz_duration * 1000);
}

async function get_test_duration(test_id) {
    let quiz_durations = Thoth_DB.get_data("select quiz_duration from quiz,test where test.test_id = :test_id AND test.quiz_id = quiz.quiz_id ", { test_id });
    let quiz_duration = quiz_durations[0].quiz_duration;
    return quiz_duration;
}

// get the ongoing test
router.get("/test_ongoing/:room_id", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let room_id = req.params.room_id;

        if (!(await is_room_member(room_id, user_id))) {
            res.sendStatus(401);
            return;
        }

        let test_ongoings = await Thoth_DB.get_data("select * from test_ongoing where room_id=:room_id", { room_id });
        res.sendStatus(test_ongoings);
    } catch (error) {
        serverError(error, res);
    }
})

// get all the over tests
router.get("/get_over_tests/:room_id/:offset", Security.authenticateToken, async (req, res) => {
    let room_id = req.params.room_id;
    let offset = parseInt(req.params.offset);
    let limit = 30;
    let user_id = req.body.user_data.user_id;

    if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
        res.sendStatus(401);
        return;
    }
    let tests = await Thoth_DB.get_data("select * from test_over where room_id=:room_id order by test_over_id DESC limit :limit offset :offset", { room_id, limit, offset });

    res.send(tests);
})

// All tests of a room
router.get("/tests/room/:room_id/:offset", Security.authenticateToken, async (req, res) => {
    let user_id = req.body.user_data.user_id;
    let offset = parseInt(req.params.offset);
    let room_id = parseInt(req.params.room_id);
    let limit = 30;

    if (!(await OwnerShipChecker.is_room_admin(room_id, user_id))) {
        res.sendStatus(401);
        return;
    }

    let tests = await Thoth_DB.get_data("select * from test where room_id=:room_id order by test_id DESC limit :limit offset :offset", { user_id, limit, offset, room_id });

    res.send(tests);
})

// All teacher tests of a room
router.get("/tests/user/:room_id/:offset", Security.authenticateToken, async (req, res) => {
    let user_id = req.body.user_data.user_id;
    let offset = parseInt(req.params.offset);
    let room_id = parseInt(req.params.room_id);
    let limit = 30;

    let tests = await Thoth_DB.get_data("select * from test where user_id=:user_id and room_id=:room_id order by test_id DESC limit :limit offset :offset", { user_id, limit, offset, room_id });

    res.send(tests);
})

module.exports = router;
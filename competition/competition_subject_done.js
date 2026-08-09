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

// Mark a competition subject as done
router.post("/competition_subject_done", Security.authenticateToken, async (req, res) => {
    try {
        let competition_subject_id = req.body.competition_subject_id ?? 0;
        let user_id = req.body.user_data.user_id;

        if (competition_subject_id == 0 || parseInt(competition_subject_id) == 0) {
            return res.sendStatus(400);
        }

        await Thoth_DB.post_data("insert into competition_subject_done(competition_subject_id,user_id) values(:competition_subject_id,:user_id)", { competition_subject_id, user_id });

        res.sendStatus(200);

    } catch (error) {
        serverError(error, res);
    }
})

// check if a competition subject has been done
router.get("/competition_subject_done/:competition_subject_id", Security.authenticateToken, async (req, res) => {
    try {
        let competition_subject_id = req.params.competition_subject_id;
        let user_id = req.body.user_data.user_id;
        let subjects = await Thoth_DB.get_data("select * from competition_subject_done where competition_subject_id=:competition_subject_id and user_id=:user_id", { competition_subject_id, user_id });
        res.send({ done: subjects.length > 0 });
    } catch (error) {
        serverError(error, res);
    }
})

module.exports = router;
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
const { Model_Helper } = require("../../utils/model_helper.js");


router.post("/flash_card_favoris", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let { flashcard_id } = req.body;

        if (!Validator.validateFields({ flashcard_id }, res)) {
            return;
        }

        await Thoth_DB.post_data("insert into flashcard_favoris(flashcard_id,user_id) values(:flashcard_id,:user_id)", {
            flashcard_id, user_id
        })

        res.sendStatus(200);

    } catch (error) {
        serverError(error, res);
    }
})

router.delete("/flash_card_favoris/:flashcard_id", Security.authenticateToken, async (req, res) => {
    try {
        let flashcard_id = JSON.parse(req.params.flashcard_id);
        let user_id = req.body.user_data.user_id;

        await Thoth_DB.delete_data("delete from flashcard_favoris where flashcard_id=:flashcard_id and user_id=:user_id", {
            flashcard_id, user_id
        })

        res.sendStatus(200);

    } catch (error) {
        serverError(error, res);
    }
})



// get the flashcard favoris of a user
router.get("/flashcard_favoris/offset/:offset", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let offset = JSON.parse(req.params.offset);
        let limit = 10;

        let flashcard_ids = await Thoth_DB.get_data("select flashcard_id from flashcard_favoris where user_id=:user_id limit :limit offset :offset", { limit, offset, user_id });

        let flashcards = [];
        for (const flashcard_id of flashcard_ids) {
            let flashcard_item = await Model_Helper.get_flashcard_item(flashcard_id.flashcard_id, user_id);
            flashcards.push(flashcard_item);
        }
        res.send(flashcards);

    } catch (error) {
        serverError(error, res);
    }
})


// get total user fav quiz
router.get("/total_fav_flashcard", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let total = await Thoth_DB.get_data("select count(*) as total from flashcard_favoris where user_id=:user_id", { user_id });
        res.send({ total: parseInt(total[0].total) });
    } catch (error) {
        serverError(error, res);
    }
})




module.exports = router;
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
const { EmailService } = require("../utils/email_service");


// Send activation code
router.get("/send_activation_code", Security.authenticateToken, async (req, res) => {
    try {

        let user_id = req.body.user_data.user_id;
        let user_data = await get_user_data(user_id);
        let user_activation_code = user_data.user_activation_code;
        if (user_activation_code == null) {
            user_activation_code = HelperFunction.generate_activation_code();
            await Thoth_DB.update_data("UPDATE user set user_activation_code=:user_activation_code WHERE user_id=:user_id", { user_activation_code, user_id });
        }

        // Sending the email to the user
        EmailService.send_account_activation_code(user_data.user_fullname, user_data.user_email, user_activation_code);

        res.sendStatus(200);


    } catch (error) {
        serverError(error, res);
    }
})



async function get_user_data(user_id) {
    let data = await Thoth_DB.get_data("SELECT user_activation_code,user_fullname,user_email FROM user WHERE user_id = :user_id", { user_id });
    return data[0];
}

// Activate account
router.post("/activate_account", Security.authenticateToken, async (req, res) => {
    try {

        let { user_activation_code } = req.body;
        let user_id = req.body.user_data.user_id;
        let field_ok = Validator.validateFields({ user_activation_code }, res);
        if (!field_ok) {
            return;
        }
        let data = await Thoth_DB.get_data("SELECT user_id FROM user WHERE user_id=:user_id AND user_activation_code = :user_activation_code", { user_id, user_activation_code });

        if (data.length > 0) {
            await activate_user_account(user_id);
            let token = Security.generateToken(data[0]);
            res.send({token});
            return;
        }

        res.sendStatus(401);

    } catch (error) {
        serverError(error, res);
    }
})

async function activate_user_account(user_id) {
    await Thoth_DB.update_data("UPDATE user set user_account_activated = 1  WHERE user_id=:user_id", { user_id });
}




module.exports = router;
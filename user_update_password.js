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
const Axios_Private = require("../utils/axios");
const { Model_Helper } = require("../utils/model_helper.js");



async function get_user_data(user_email) {
    let data = await Thoth_DB.get_data("SELECT user_id,user_fullname,user_unlock_code FROM user WHERE user_email = :user_email", { user_email });
    return data[0];
}


// Get the unlock code
router.get("/unlock_code/user_email/:user_email", async (req, res) => {
    try {
        let user_email = req.params.user_email.trim();
        let user_exist = await Model_Helper.check_if_user_exist_by_email(user_email);
        if (!user_exist.already_taken) {
            res.sendStatus(401);
            return;
        }

        let user_data = await get_user_data(user_email);
        let code;

        if (user_data.user_unlock_code == null) {
            code = HelperFunction.generate_activation_code();
            await Thoth_DB.update_data("update user set user_unlock_code=:code where user_email=:user_email", { code, user_email });
        } else {
            code = user_data.user_unlock_code;
        }

        // Sending the email to the user
        EmailService.send_account_unlock_code(user_data.user_fullname, user_email, code);
        // generate a 10 min token
        let token = Security.generate_password_token({ user_id: user_data.user_id })
        res.send({ token });
    } catch (error) {
        serverError(error, res);
    }
})





// Unlock the page
router.post("/unlock_pass", Security.authenticateToken, async (req, res) => {
    try {
        let { user_unlock_code } = req.body;
        let user_id = req.body.user_data.user_id;

        if (!Validator.validateFields({ user_unlock_code }, res)) {
            return;
        }

        let users = await Thoth_DB.get_data("select * from user where user_id=:user_id and user_unlock_code=:user_unlock_code", { user_id, user_unlock_code });

        if (users.length > 0) {
            res.sendStatus(200);
        } else {
            res.sendStatus(401);
        }
    } catch (error) {
        serverError(error, res);
    }
})


// Change password 
router.post("/update_password", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let { user_password, user_confirm_password } = req.body;
        let fields_ok = Validator.validateFields({ user_password, user_confirm_password }, res);
        if (!fields_ok) {
            return;
        }
        if (user_password != user_confirm_password) {

            res.status(403).send({
                status: 400,
                msg: "The passwords don't match!"
            })
            return;
        }

        user_password = Security.encryptPassword(user_password)
        await Thoth_DB.post_data("UPDATE user set user_password = :user_password WHERE user_id=:user_id", { user_password, user_id });
        let token = Security.generateToken({ user_id });

        res.send({ token })

    } catch (error) {
        serverError(error, res);
    }
})

// Checking if the old entered password is correct
router.get("/check/password/:user_password", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let user_password = req.params.user_password;
        let password_belong_to_user = await OwnerShipChecker.password_belong_to_user(user_password, user_id);

        if (!password_belong_to_user) {
            res.statusCode = 404;
            res.send("It doesn't match");
            return;
        }

        res.send({
            status: 200,
            password_belong_to_user: password_belong_to_user
        })
    } catch (error) {
        serverError(error, res);
    }
})


// Changing the password while knowing the old one
router.patch("/change/password", Security.authenticateToken, async (req, res) => {
    try {
        let user_id = req.body.user_data.user_id;
        let { user_password, user_confirm_password, user_current_password } = req.body;
        let fields_ok = Validator.validateFields({ user_password, user_confirm_password, user_current_password }, res);

        if (!fields_ok) { return; }

        if (!(await OwnerShipChecker.password_belong_to_user(user_current_password, user_id))) {
            res.statusCode = 401;
            res.send({
                status: 400,
                msg: "Your current  password is incorrect!"
            })
            return;
        }

        if (user_password != user_confirm_password) {
            res.statusCode = 403;
            res.send({
                status: 400,
                msg: "The passwords don't match!"
            })
            return;
        }

        user_password = Security.encryptPassword(user_password);
        await Thoth_DB.update_data("UPDATE user set user_password = :user_password WHERE user_id=:user_id", { user_password, user_id });

        res.send({
            status: 200,
            msg: "Password modified successfully!"
        })

    } catch (error) {
        serverError(error, res);
    }
})



module.exports = router;
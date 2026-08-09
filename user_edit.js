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
const { Drive_Service } = require("../services/drive/drive.js");

const sharp = require("sharp");

router.post("/post_file", async (req, res) => {
  try {
    console.log(req.files.file);

    let user_avatar = await Drive_Service.upload_file(
      req.files.file.name,
      req.files.file.data,
    );
    res.send({ cool: 14 });
  } catch (error) {
    serverError(error, res);
  }
});

router.patch("/avatar", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;

    if (!Validator.validateFilesInput(req, res)) {
      return;
    }

    if (!HelperFile.is_image(req.files.file)) {
      res.status(401).send({
        msg: "Please provide a valid image file!",
      });
      return;
    }

    if (HelperFile.fileExceed10M(req.files.file)) {
      res.status(401).send({
        msg: "The image size must not exceed 10M!",
      });
      return;
    }

    delete_old_avatar(user_id);
    let file_name = req.files.file.name;

    sharp(req.files.file.data)
      .resize(300)
      .png({ progressive: true, quality: 10 })
      .toBuffer()
      .then(async (data) => {
        let user_avatar = await Drive_Service.upload_file(file_name, data);

        await Thoth_DB.update_data(
          "UPDATE user SET user_avatar=:user_avatar WHERE user_id=:user_id",
          {
            user_avatar,
            user_id,
          },
        );

        res.send({ user_avatar: `${Consts.stream_url}${user_avatar}` });
      })
      .catch((err) => {
        res.status(500).send(err);
      });
  } catch (error) {
    serverError(error, res);
  }
});

async function delete_old_avatar(user_id) {
  let users = await Thoth_DB.get_data(
    "select user_avatar from user where user_id=:user_id",
    { user_id },
  );
  if (users.length == 0) return;
  let user_avatar = users[0].user_avatar;
  if (user_avatar == Consts.avatar_file_id) return;
  Drive_Service.delete_file(user_avatar);
}

router.patch("/user_bio", Security.authenticateToken, async (req, res) => {
  try {
    let user_bio = req.body.user_bio ?? "";

    user_bio = user_bio.trim();

    let user_id = req.body.user_data.user_id;

    await Thoth_DB.update_data(
      "update user set user_bio=:user_bio where user_id=:user_id",
      {
        user_bio,
        user_id,
      },
    );

    res.send({
      status: 200,
      msg: "Bio Updated successfully",
    });
  } catch (error) {
    serverError(error, res);
  }
});

router.patch("/user_fullname", Security.authenticateToken, async (req, res) => {
  try {
    let { user_fullname } = req.body;
    let field_ok = Validator.validateFields({ user_fullname }, res);
    if (!field_ok) {
      return;
    }
    user_fullname = HelperFunction.Ucase(user_fullname);
    let user_id = req.body.user_data.user_id;

    await Thoth_DB.update_data(
      "update user set user_fullname=:user_fullname where user_id=:user_id",
      {
        user_fullname,
        user_id,
      },
    );

    res.send({ user_fullname });
  } catch (error) {
    serverError(error, res);
  }
});

router.patch("/user_email", Security.authenticateToken, async (req, res) => {
  try {
    let { user_email } = req.body;
    let field_ok = Validator.validateFields({ user_email }, res);
    if (!field_ok) {
      return;
    }
    user_email = user_email.trim();
    let user_id = req.body.user_data.user_id;

    await Thoth_DB.update_data(
      "update user set user_email=:user_email where user_id=:user_id",
      {
        user_email,
        user_id,
      },
    );

    await desactivate_user_account(user_id);
    await generate_new_activation_code(user_id);
    res.send({ user_email });
  } catch (error) {
    serverError(error, res);
  }
});

async function desactivate_user_account(user_id) {
  await Thoth_DB.update_data(
    "update user set user_account_activated = null WHERE user_id=:user_id",
    { user_id },
  );
}
async function generate_new_activation_code(user_id) {
  let user_activation_code = HelperFunction.generate_activation_code();
  await Thoth_DB.update_data(
    "update user set user_activation_code = :user_activation_code WHERE user_id=:user_id",
    { user_activation_code, user_id },
  );
}

router.patch("/country", Security.authenticateToken, async (req, res) => {
  try {
    let country_id = req.body.country_id ?? 0;
    let user_id = req.body.user_data.user_id;
    if (parseInt(country_id) == 0) {
      return res.sendStatus(400);
    }

    await Thoth_DB.update_data(
      "update user set country_id = :country_id where user_id=:user_id",
      { country_id, user_id },
    );

    let country_name = await Model_Helper.get_country_data(country_id);
    res.send({ country_name });
  } catch (error) {
    serverError(error, res);
  }
});

module.exports = router;

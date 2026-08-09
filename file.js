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
const { Db } = require("typeorm");
const { Drive_Service } = require("../services/drive/drive.js");

router.post("/upload-file", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;

    let url = await Drive_Service.upload_file(
      req.files.file.name,
      req.files.file.data,
    );

    await Thoth_DB.post_data(
      "insert into file(user_id,url) values(:user_id,:url)",
      {
        user_id,
        url,
      },
    );

    res.send({ url: `${Consts.stream_url}${url}` });
  } catch (error) {
    serverError(error, res);
  }
});

router.delete("/delete-file", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = parseInt(req.body.user_data.user_id);
    let url = req.body.url;
    await Thoth_DB.delete_data(
      "delete from file where url=:url and user_id=:user_id",
      { url, user_id },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

module.exports = router;

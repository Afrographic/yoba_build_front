const express = require("express");
const router = express.Router();
const { Security } = require("../utils/security");
const { Validator } = require("../utils/validator");
const { HelperFunction } = require("../utils/helper_function");
const { HelperFile } = require("../utils/helper_file.js");
const { OwnerShipChecker } = require("../utils/ownership_checker.js");
const { Consts } = require("../consts.js");
const { serverError } = require("../utils/server_error.js");
const { DB } = require("../db.js");
const { Offre_Controller } = require("../controllers/offre_controller.js");

router.post("/upload-file", Security.authenticateToken, async (req, res) => {
  try {

    if (req.files == undefined) return res.sendStatus(400);
    let user_id = req.body.user_data.user_id;
    let file = req.files["file"];
    file.mv(`./public/backend_files/bd_${user_id}_${file.name}`);
    let file_url = `${Consts.backend_host}/backend_files/bd_${user_id}_${file.name}`;
    DB.post_data(
      "insert into file(file_url,user_id) values(:file_url,:user_id)",
      { file_url, user_id },
    );
    res.send({ file_url });
  } catch (error) {
    serverError(error, res);
  }
});

router.post("/delete-file", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    const file_url = req.body.file_url;

    if (!file_url) {
      return res.status(400).json({ error: "Missing url parameter" });
    }
    await DB.delete_data("delete from file where file_url=:file_url and user_id=:user_id",{file_url,user_id});
    HelperFile.deleteFileFromServer(file_url);
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

module.exports = router;

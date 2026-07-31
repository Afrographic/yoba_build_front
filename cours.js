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

router.post("/cours", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let { cours, level_id, subject_id, chapter_id } = req.body;
    let created_at = new Date();
    if (cours.trim().length == 0) {
      return res.sendStatus(400);
    }
    let data = await Thoth_DB.post_data(
      "insert into cours(cours,level_id,subject_id,chapter_id,user_id,created_at) values(:cours,:level_id,:subject_id,:chapter_id,:user_id,:created_at)",
      {
        cours,
        level_id,
        subject_id,
        chapter_id,
        user_id,
        created_at,
      },
    );
    res.send({ id: data[0] });
  } catch (error) {
    serverError(error, res);
  }
});

router.patch("/cours/:id", Security.authenticateToken, async (req, res) => {
  try {
    let id = parseInt(req.params.id);
    let user_id = req.body.user_data.user_id;
    let { cours } = req.body;
    await Thoth_DB.update_data(
      "update cours set cours=:cours where id=:id and user_id=:user_id",
      {
        cours,
        id,
        user_id,
      },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

router.delete("/cours/:id", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let id = parseInt(req.params.id);
    await Thoth_DB.delete_data(
      "delete from cours where id=:id and user_id=:user_id",
      { id, user_id },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

router.get("/cours/:id", Security.authenticateToken, async (req, res) => {
  try {
    let id = parseInt(req.params.id);
    let data = await Thoth_DB.get_data("select * from cours where id=:id", {
      id,
    });
    if (data.length == 0) return res.sendStatus(404);
    data[0].cours = JSON.parse(data[0].cours);
    res.send(data);
  } catch (error) {
    serverError(error, res);
  }
});

module.exports = router;

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
const { Drive_Service } = require("../services/drive/drive.js");

router.post("/new_voice", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let { new_id, new_voice_description } = req.body;
    let new_voice_created_date = new Date();

    let field_ok = Validator.validateFields({ new_voice_description }, res);
    if (!field_ok) {
      return;
    }

    if (!(await OwnerShipChecker.is_new_owner(new_id, user_id))) {
      res.sendStatus(401);
      return;
    }

    if (Validator.valid_voice_upload(req)) {
      res.sendStatus(401);
      return;
    }

    let new_voice_name = req.files.file.name;
    let new_voice_url = await Drive_Service.upload_file(
      req.files.file.name,
      req.files.file.data,
    );
    new_voice_description = HelperFunction.Ucase(new_voice_description);

    await Thoth_DB.post_data(
      "insert into new_voice(new_voice_name,new_voice_url,new_voice_description,new_voice_created_date,new_id,user_id) values(:new_voice_name,:new_voice_url,:new_voice_description,:new_voice_created_date,:new_id,:user_id)",
      {
        new_voice_name,
        new_voice_url,
        new_voice_description,
        new_voice_created_date,
        new_id,
        user_id,
      },
    );

    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

router.patch(
  "/description/new_voice/:new_voice_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let new_voice_id = req.params.new_voice_id;

      if (!(await OwnerShipChecker.is_new_voice_owner(new_voice_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      let { new_voice_description } = req.body;
      let field_ok = Validator.validateFields({ new_voice_description }, res);
      if (!field_ok) {
        return;
      }

      new_voice_description = HelperFunction.Ucase(new_voice_description);

      await Thoth_DB.update_data(
        "update new_voice set new_voice_description = :new_voice_description",
        { new_voice_description },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.delete(
  "/new_voice/:new_voice_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let new_voice_id = req.params.new_voice_id;

      if (!(await OwnerShipChecker.is_new_voice_owner(new_voice_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      await delete_file_from_server(new_voice_id);

      await Thoth_DB.delete_data(
        "delete from new_voice where new_voice_id=:new_voice_id",
        { new_voice_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function delete_file_from_server() {
  let files = await Thoth_DB.get_data(
    "select new_voice_url from new_voice where new_voice_id=:new_voice_id",
    { new_voice_id },
  );
  HelperFile.deleteFileFromServer(files[0].new_voice_url);
}

// get voices of a news
router.get(
  "/new_voice/new/:new_id/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let new_id = req.params.new_id;
      let room_id = req.params.room_id;

      if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      let new_voices = await Thoth_DB.get_data(
        "select * from new_voice where new_id=:new_id",
        { new_id },
      );
      for (let i = 0; i < new_voices.length; i++) {
        new_voices[i].new_voice_url =
          `${Consts.stream_url}${new_voices[i].new_voice_url}`;
      }

      res.send(new_voices);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

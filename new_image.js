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

router.post("/new_image", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let { new_id, new_image_description } = req.body;
    let new_image_created_date = new Date();

    let field_ok = Validator.validateFields({ new_image_description }, res);
    if (!field_ok) {
      return;
    }

    if (!(await OwnerShipChecker.is_new_owner(new_id, user_id))) {
      res.sendStatus(401);
      return;
    }

    if (Validator.valid_image_upload(req)) {
      res.sendStatus(401);
      return;
    }

    let new_image_name = req.files.file.name;
    let new_image_url = await Drive_Service.upload_file(
      req.files.file.name,
      req.files.file.data,
    );
    new_image_description = HelperFunction.Ucase(new_image_description);

    await Thoth_DB.post_data(
      "insert into new_image(new_image_name,new_image_url,new_image_description,new_image_created_date,new_id,user_id) values(:new_image_name,:new_image_url,:new_image_description,:new_image_created_date,:new_id,:user_id)",
      {
        new_image_name,
        new_image_url,
        new_image_description,
        new_image_created_date,
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
  "/description/new_image/:new_image_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let new_image_id = req.params.new_image_id;

      if (!(await OwnerShipChecker.is_new_image_owner(new_image_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      let { new_image_description } = req.body;
      let field_ok = Validator.validateFields({ new_image_description }, res);
      if (!field_ok) {
        return;
      }

      new_image_description = HelperFunction.Ucase(new_image_description);

      await Thoth_DB.update_data(
        "update new_image set new_image_description = :new_image_description",
        { new_image_description },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.delete(
  "/new_image/:new_image_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let new_image_id = req.params.new_image_id;

      if (!(await OwnerShipChecker.is_new_image_owner(new_image_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      await delete_file_from_server(new_image_id);

      await Thoth_DB.delete_data(
        "delete from new_image where new_image_id=:new_image_id",
        { new_image_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function delete_file_from_server() {
  let files = await Thoth_DB.get_data(
    "select new_image_url from new_image where new_image_id=:new_image_id",
    { new_image_id },
  );
  HelperFile.deleteFileFromServer(files[0].new_image_url);
}

// get images of a news
router.get(
  "/new_image/new/:new_id/room/:room_id",
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

      let new_images = await Thoth_DB.get_data(
        "select * from new_image where new_id=:new_id",
        { new_id },
      );
      for (let i = 0; i < new_images.length; i++) {
        new_images[i].new_image_url =
          `${Consts.stream_url}${new_images[i].new_image_url}`;
      }

      res.send(new_images);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

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
const { User_Controller } = require("../controllers/user_controller.js");
const { NotifEngine } = require("../services/NotifEngine.js");

// Create a new for a room
router.post("/new", Security.authenticateToken, async (req, res) => {
  let user_id = req.body.user_data.user_id;
  let owner_user_id = user_id;

  let new_created_date = new Date();
  let { new_content, room_id } = req.body;

  let fields_ok = Validator.validateFields({ new_content, room_id }, res);
  if (!fields_ok) {
    return;
  }

  if (!(await OwnerShipChecker.is_room_admin(room_id, user_id))) {
    res.sendStatus(401);
    return;
  }

  new_content = HelperFunction.Ucase(new_content);
  let news = await Thoth_DB.post_data(
    "insert into new(new_content,new_created_date,room_id,user_id) values(:new_content,:new_created_date,:room_id,:user_id)",
    {
      new_content,
      new_created_date,
      room_id,
      user_id,
    },
  );

  let new_id = news[0];

  // Notifier les concernes
  let rooms = await Thoth_DB.get_data(
    "select * from room where room_id=:room_id",
    { room_id },
  );
  if (rooms.length > 0) {
    let room_name = rooms[0].room_name;
    //notify room members
    let members = await Thoth_DB.get_data(
      "select * from user_room where room_id=:room_id",
      { room_id },
    );
    for (let item of members) {
      let user_id = item.user_id;
      if (user_id != owner_user_id) {
        let user_data = await User_Controller.get_user_data(user_id);
        let message = `Cher ${user_data.user_fullname}, Une nouvelle annonce a ete ajoute   dans votre  salle ${room_name} - << ${new_content}>>`;
        NotifEngine.new(user_id, message);
      }
    }
  }
  res.send({ new_id });
});

// add image to a new
router.post("/new_image", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let new_id = req.body.new_id ?? 0;

    if (new_id == 0) {
      return res.sendStatus(400);
    }

    if (!(await OwnerShipChecker.is_new_owner(new_id, user_id))) {
      res.sendStatus(401);
      return;
    }

    if (!Validator.valid_image_upload(req)) {
      res.sendStatus(401);
      return;
    }

    let new_image_url = await Drive_Service.upload_file(
      req.files.file.name,
      req.files.file.data,
    );
    await Thoth_DB.post_data(
      "insert into new_image(new_image_url,new_id,user_id) values(:new_image_url,:new_id,:user_id)",
      { new_image_url, new_id, user_id },
    );

    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

// add file to a new
router.post("/new_file", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let new_id = req.body.new_id ?? 0;

    if (new_id == 0) {
      return res.sendStatus(400);
    }

    if (!(await OwnerShipChecker.is_new_owner(new_id, user_id))) {
      res.sendStatus(401);
      return;
    }

    if (!Validator.valid_file_upload(req)) {
      res.sendStatus(401);
      return;
    }

    let new_file_url = await Drive_Service.upload_file(
      req.files.file.name,
      req.files.file.data,
    );

    await Thoth_DB.post_data(
      "insert into new_file(new_file_url,new_id,user_id) values(:new_file_url,:new_id,:user_id)",
      { new_file_url, new_id, user_id },
    );

    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

// add voice to a new
router.patch(
  "/voice/new/:new_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let new_id = req.params.new_id;

      if (!(await OwnerShipChecker.is_new_owner(new_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      if (!Validator.valid_voice_upload(req)) {
        res.sendStatus(401);
        return;
      }

      let new_voice = await Drive_Service.upload_file(
        req.files.file.name,
        req.files.file.data,
      );
      await Thoth_DB.update_data(
        "update new set new_voice=:new_voice where new_id=:new_id",
        { new_voice, new_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/new_content/:new_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let new_id = req.params.new_id;
      let new_content = req.body.new_content ?? "";

      if (new_content.trim().length == 0) {
        return res.sendStatus(400);
      }

      await Thoth_DB.update_data(
        "update new set new_content=:new_content where new_id=:new_id and user_id=:user_id",
        { new_content, new_id, user_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// Get news  of a room
router.get(
  "/news/room/:room_id/:offset",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let room_id = req.params.room_id;
      let offset = JSON.parse(req.params.offset);
      let limit = 10;

      if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      let news = await Thoth_DB.get_data(
        "select user_fullname,user_avatar,new.* from user,new where user.user_id= new.user_id and room_id=:room_id order by new_id DESC limit :limit offset :offset",
        { room_id, limit, offset },
      );

      news = await get_audio_images_voices(news);

      res.send(news);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get new item
router.get(
  "/new/:new_id/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let new_id = req.params.new_id;
      let room_id = req.params.room_id;
      let user_id = req.body.user_data.user_id;

      if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      let news = await Thoth_DB.get_data(
        "select user_fullname,user_avatar,new.* from user,new where user.user_id= new.user_id and new_id=:new_id",
        { room_id, new_id },
      );

      news = await get_audio_images_voices(news);

      res.send(news);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function get_audio_images_voices(news) {
  for (const new_item of news) {
    let index = news.indexOf(new_item);
    new_item.files_urls = await get_files(new_item);
    new_item.images_url = await get_images(new_item);
    if (new_item.new_voice && new_item.new_voice.trim().length > 0) {
      new_item.new_voice = `${Consts.stream_url}${new_item.new_voice}`;
    }
    new_item.user_avatar = `${Consts.stream_url}${new_item.user_avatar}`;
    news[index] = new_item;
  }
  return news;
}

async function get_files(new_item) {
  try {
    let files = await Thoth_DB.get_data(
      `select * from new_file where new_id=${new_item.new_id}`,
    );
    let returner = [];
    for (const item of files) {
      let url = `${Consts.stream_url}${item.new_file_url}`;
      returner.push(url);
    }
    return returner;
  } catch (error) {
    console.log(error);
    return [];
  }
}
async function get_images(new_item) {
  try {
    let images = await Thoth_DB.get_data(
      `select * from new_image where new_id=${new_item.new_id}`,
    );
    let returner = [];
    for (const item of images) {
      let url = `${Consts.stream_url}${item.new_image_url}`;
      returner.push(url);
    }
    return returner;
  } catch (error) {
    console.log(error);
    return [];
  }
}

// get total news of a room
router.get(
  "/count_new/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    let user_id = req.body.user_data.user_id;
    let room_id = req.params.room_id;

    if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
      res.sendStatus(401);
      return;
    }

    let total = await Thoth_DB.get_data(
      "select count(new_id) as total from new where room_id=:room_id",
      { room_id },
    );
    total = parseInt(total[0].total);

    res.send({ total });
  },
);

// Search news
router.get(
  "/search_news/room/:room_id/token/:token",
  Security.authenticateToken,
  async (req, res) => {
    let user_id = req.body.user_data.user_id;
    let room_id = req.params.room_id;
    let token = req.params.token;

    if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
      res.sendStatus(401);
      return;
    }

    let news = await Thoth_DB.get_data(
      `select user_fullname,user_avatar,new.* from new,user where new.user_id = user.user_id and new_content like '%${token}%' and room_id=:room_id`,
      {
        room_id,
      },
    );

    news = await get_audio_images_voices(news);

    res.send(news);
  },
);

router.delete("/new/:new_id", Security.authenticateToken, async (req, res) => {
  let user_id = req.body.user_data.user_id;
  let new_id = req.params.new_id;

  if (!(await OwnerShipChecker.is_new_owner(new_id, user_id))) {
    res.sendStatus(401);
    return;
  }

  // Delete all the images from the server
  await delete_new_image(new_id);
  // Delete all the files from the server
  await delete_new_file(new_id);

  await Thoth_DB.delete_data("delete from new where new_id=:new_id", {
    new_id,
  });
  res.sendStatus(200);
});

async function delete_new_image(new_id) {
  let images = await Thoth_DB.get_data(
    "select * from new_image where new_id=:new_id",
    { new_id },
  );
  if (images.length == 0) return;
  for (const image of images) {
    HelperFile.delete_file_from_server(image.new_image_url);
  }
}

async function delete_new_file(new_id) {
  let files = await Thoth_DB.get_data(
    "select * from new_file where new_id=:new_id",
    { new_id },
  );
  if (files.length == 0) return;
  for (const file of files) {
    HelperFile.delete_file_from_server(file.new_file_url);
  }
}

module.exports = router;

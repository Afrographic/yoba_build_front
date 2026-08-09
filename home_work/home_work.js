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
const { Drive_Service } = require("../../services/drive/drive.js");
const { User_Controller } = require("../../controllers/user_controller.js");
const { NotifEngine } = require("../../services/NotifEngine.js");

// Create a home_work for a room
router.post("/home_work", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let owner_user_id = user_id;
    let home_work_created_date = new Date();
    let {
      home_work_description,
      room_id,
      home_work_total_point,
      home_work_duration_in_days,
    } = req.body;

    

    let fields_ok = Validator.validateFields(
      {
        home_work_description,
        room_id,
        home_work_total_point,
        home_work_duration_in_days,
      },
      res,
    );
    if (!fields_ok) {
      return;
    }

    if (!(await OwnerShipChecker.is_room_admin(room_id, user_id))) {
      res.sendStatus(401);
      return;
    }

    home_work_description = HelperFunction.Ucase(home_work_description);
    let home_work = await Thoth_DB.post_data(
      "insert into home_work(home_work_description,home_work_total_point,home_work_created_date,home_work_duration_in_days,room_id,user_id) values(:home_work_description,:home_work_total_point,:home_work_created_date,:home_work_duration_in_days,:room_id,:user_id)",
      {
        home_work_description,
        home_work_total_point,
        home_work_created_date,
        home_work_duration_in_days,
        room_id,
        user_id,
      },
    );

    let home_work_id = home_work[0];

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
          let message = `Cher ${user_data.user_fullname}, Un nouveau Devoir a ete donnee  dans votre salle ${room_name}. Veuillez vous connecter pour le faire! - << ${home_work_description}>>`;
          NotifEngine.new(user_id, message);
        }
      }
    }

    res.send({ home_work_id });
  } catch (error) {
    serverError(error, res);
  }
});

// add image to a new
router.post(
  "/home_work_image",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let home_work_id = req.body.home_work_id ?? 0;

      if (home_work_id == 0) {
        return res.sendStatus(400);
      }

      if (!(await OwnerShipChecker.check("home_work", home_work_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      if (!Validator.valid_image_upload(req)) {
        res.sendStatus(401);
        return;
      }

      let home_work_image_url = await Drive_Service.upload_file(
        req.files.file.name,
        req.files.file.data,
      );
      await Thoth_DB.post_data(
        "insert into home_work_image(home_work_image_url,home_work_id,user_id) values(:home_work_image_url,:home_work_id,:user_id)",
        { home_work_image_url, home_work_id, user_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// add file to a new
router.post("/home_work_file", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let home_work_id = req.body.home_work_id ?? 0;

    if (home_work_id == 0) {
      return res.sendStatus(400);
    }

    if (!(await OwnerShipChecker.check("home_work", home_work_id, user_id))) {
      res.sendStatus(401);
      return;
    }

    if (!Validator.valid_file_upload(req)) {
      res.sendStatus(401);
      return;
    }

    let home_work_file_url = await Drive_Service.upload_file(
      req.files.file.name,
      req.files.file.data,
    );

    await Thoth_DB.post_data(
      "insert into home_work_file(home_work_file_url,home_work_id,user_id) values(:home_work_file_url,:home_work_id,:user_id)",
      { home_work_file_url, home_work_id, user_id },
    );

    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

// get home_work item
router.get(
  "/home_work/:home_work_id/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let home_work_id = req.params.home_work_id;
      let room_id = req.params.room_id;
      let user_id = req.body.user_data.user_id;

      if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      let home_works = await Thoth_DB.get_data(
        "select user_fullname,user_avatar,home_work.* from user,home_work where user.user_id= home_work.user_id and home_work_id=:home_work_id",
        { room_id, home_work_id },
      );

      home_works = await get_more_data(home_works, room_id, user_id);

      res.send(home_works);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// Get home_works  of a room
router.get(
  "/home_work/room/:room_id/offset/:offset",
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

      let home_works = await Thoth_DB.get_data(
        "select user_fullname,user_avatar,home_work.* from user,home_work where user.user_id= home_work.user_id and room_id=:room_id order by home_work_id DESC limit :limit offset :offset",
        { room_id, limit, offset },
      );

      home_works = await get_more_data(home_works, room_id, user_id);

      res.send(home_works);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function get_more_data(home_works, room_id, user_id) {
  for (const home_work_item of home_works) {
    let index = home_works.indexOf(home_work_item);
    home_work_item.user_avatar = `${Consts.stream_url}${home_work_item.user_avatar}`;

    home_work_item.files_urls = await get_files(home_work_item);
    home_work_item.images_url = await get_images(home_work_item);

    home_work_item.total_remise = await get_total_remise(home_work_item);
    home_work_item.has_given = await get_if_has_given(
      home_work_item,
      room_id,
      user_id,
    );
    home_work_item.is_corrected = await get_is_corrected(home_work_item);
    home_work_item.user_corrected = await get_if_user_corrected(
      home_work_item,
      user_id,
    );
    home_works[index] = home_work_item;
  }
  return home_works;
}

async function get_if_user_corrected(home_work_item, user_id) {
  let data = await Thoth_DB.get_data(
    `select home_work_student_id from home_work_student where home_work_id=${home_work_item.home_work_id} and user_id = ${user_id} and home_work_student_corrected = 1`,
  );

  return data.length > 0;
}

async function get_is_corrected(home_work_item) {
  let data = await Thoth_DB.get_data(
    `select * from home_work_correction where home_work_id=${home_work_item.home_work_id} `,
  );
  return data.length > 0;
}

async function get_if_has_given(home_work_item, room_id, user_id) {
  let data = await Thoth_DB.get_data(
    `select home_work_student_id from home_work_student where home_work_id=${home_work_item.home_work_id} and room_id = ${room_id} and user_id= ${user_id}`,
  );
  return data.length > 0;
}

async function get_total_remise(home_work_item) {
  let home_work_id = home_work_item.home_work_id;
  let res = await Thoth_DB.get_data(
    "select count(*) as total from home_work_student where home_work_id=:home_work_id",
    { home_work_id },
  );
  return res[0].total;
}

async function get_files(home_work_item) {
  try {
    let files = await Thoth_DB.get_data(
      `select * from home_work_file where home_work_id=${home_work_item.home_work_id}`,
    );
    let returner = [];
    for (const item of files) {
      let url = `${Consts.stream_url}${item.home_work_file_url}`;
      returner.push(url);
    }
    return returner;
  } catch (error) {
    console.log(error);
    return [];
  }
}

async function get_images(home_work_item) {
  try {
    let images = await Thoth_DB.get_data(
      `select * from home_work_image where home_work_id=${home_work_item.home_work_id}`,
    );
    let returner = [];
    for (const item of images) {
      let url = `${Consts.stream_url}${item.home_work_image_url}`;
      returner.push(url);
    }
    return returner;
  } catch (error) {
    console.log(error);
    return [];
  }
}

// get total home_works of a room
router.get(
  "/count_home_work/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let room_id = req.params.room_id;

      if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      let total = await Thoth_DB.get_data(
        "select count(home_work_id) as total from home_work where room_id=:room_id",
        { room_id },
      );
      total = parseInt(total[0].total);

      res.send({ total });
    } catch (error) {
      serverError(error, res);
    }
  },
);

// Search home_works
router.get(
  "/search_home_works/room/:room_id/token/:token",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let room_id = req.params.room_id;
      let token = req.params.token;

      if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      let home_works = await Thoth_DB.get_data(
        `select user_fullname,user_avatar,home_work.* from home_work,user where home_work.user_id = user.user_id and home_work_description like '%${token}%' and room_id=:room_id`,
        {
          room_id,
        },
      );

      home_works = await get_more_data(home_works, room_id, user_id);

      res.send(home_works);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.delete(
  "/home_work/:home_work_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let home_work_id = req.params.home_work_id;

      if (!(await OwnerShipChecker.check("home_work", home_work_id, user_id))) {
        return res.sendStatus(401);
      }

      // Delete all the images from the server
      await delete_home_work_image(home_work_id);
      // Delete all the files from the server
      await delete_home_work_file(home_work_id);

      await Thoth_DB.delete_data(
        "delete from home_work where home_work_id=:home_work_id and user_id=:user_id",
        { home_work_id, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function delete_home_work_image(home_work_id) {
  let images = await Thoth_DB.get_data(
    "select * from home_work_image where home_work_id=:home_work_id",
    { home_work_id },
  );
  if (images.length == 0) return;
  for (const image of images) {
    Drive_Service.delete_file(image.home_work_image_url);
  }
}

async function delete_home_work_file(home_work_id) {
  let files = await Thoth_DB.get_data(
    "select * from home_work_file where home_work_id=:home_work_id",
    { home_work_id },
  );
  if (files.length == 0) return;
  for (const file of files) {
    Drive_Service.delete_file(file.home_work_file_url);
  }
}

// update home consigne
router.patch(
  "/home_work_consigne/:home_work_id",
  [Security.authenticateToken],
  async (req, res) => {
    try {
      let home_work_id = req.params.home_work_id;
      let user_id = req.body.user_data.user_id;
      let home_work_description = req.body.home_work_description ?? "";
      if (home_work_description.trim().length == 0) {
        return res.sendStatus(400);
      }
      await Thoth_DB.update_data(
        "update home_work set home_work_description = :home_work_description where home_work_id=:home_work_id and user_id=:user_id",
        { home_work_description, home_work_id, user_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

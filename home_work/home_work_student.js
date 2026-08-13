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
const Axios_Private = require("../../utils/axios");
const { Drive_Service } = require("../../services/drive/drive.js");
const { User_Controller } = require("../../controllers/user_controller.js");
const { NotifEngine } = require("../../services/NotifEngine.js");
const { EmailService } = require("../../utils/email_service.js");

// Create a home_work for a room
router.post(
  "/home_work_student",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let home_work_student_created_date = new Date();
      let { home_work_id, room_id } = req.body;

      let fields_ok = Validator.validateFields({ home_work_id, room_id }, res);
      if (!fields_ok) {
        return;
      }

      if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      await check_if_already_exist(user_id, room_id, home_work_id);

      let home_work_student = await Thoth_DB.post_data(
        "insert into home_work_student(home_work_student_created_date,home_work_id,room_id,user_id) values(:home_work_student_created_date,:home_work_id,:room_id,:user_id)",
        {
          home_work_student_created_date,
          home_work_id,
          room_id,
          user_id,
        },
      );

      let home_work_student_id = home_work_student[0];
      res.send({ home_work_student_id });
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function check_if_already_exist(user_id, room_id, home_work_id) {
  let data = await Thoth_DB.get_data(
    "select home_work_student_id from home_work_student where user_id=:user_id and room_id=:room_id and home_work_id=:home_work_id",
    { user_id, room_id, home_work_id },
  );
  if (data.length == 0) return;
  let home_work_student_id = data[0].home_work_student_id;
  // Delete all the images from the server
  await delete_home_work_student_image(home_work_student_id);
  // Delete all the files from the server
  await delete_home_work_student_file(home_work_student_id);

  await Thoth_DB.delete_data(
    "delete from home_work_student where home_work_student_id=:home_work_student_id and user_id=:user_id",
    { home_work_student_id, user_id },
  );
}

// add image to a home_work_student
router.post(
  "/home_work_student_image",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let home_work_student_id = req.body.home_work_student_id ?? 0;

      if (home_work_student_id == 0) {
        return res.sendStatus(400);
      }

      if (
        !(await OwnerShipChecker.check(
          "home_work_student",
          home_work_student_id,
          user_id,
        ))
      ) {
        res.sendStatus(401);
        return;
      }

      if (!Validator.valid_image_upload(req)) {
        res.sendStatus(401);
        return;
      }

      let home_work_student_image_url = await Drive_Service.upload_file(
        req.files.file.name,
        req.files.file.data,
      );
      await Thoth_DB.post_data(
        "insert into home_work_student_image(home_work_student_image_url,home_work_student_id,user_id) values(:home_work_student_image_url,:home_work_student_id,:user_id)",
        { home_work_student_image_url, home_work_student_id, user_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// add files to a home_work_student
router.post(
  "/home_work_student_file",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let home_work_student_id = req.body.home_work_student_id ?? 0;

      if (home_work_student_id == 0) {
        return res.sendStatus(400);
      }

      if (
        !(await OwnerShipChecker.check(
          "home_work_student",
          home_work_student_id,
          user_id,
        ))
      ) {
        res.sendStatus(401);
        return;
      }

      if (!Validator.valid_file_upload(req)) {
        res.sendStatus(401);
        return;
      }

      let home_work_student_file_url = await Drive_Service.upload_file(
        req.files.file.name,
        req.files.file.data,
      );
      await Thoth_DB.post_data(
        "insert into home_work_student_file(home_work_student_file_url,home_work_student_id,user_id) values(:home_work_student_file_url,:home_work_student_id,:user_id)",
        { home_work_student_file_url, home_work_student_id, user_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// Get a single home_work
router.get(
  "/home_work_student_item/room/:room_id/home_work/:home_work_id/user/:user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.params.user_id;
      let home_work_id = req.params.home_work_id;
      let room_id = req.params.room_id;

      let student_home_works = await Thoth_DB.get_data(
        "select user_fullname,user_avatar,home_work_student.* from user,home_work_student where home_work_id=:home_work_id and home_work_student.room_id=:room_id and home_work_student.user_id = :user_id and  user.user_id= home_work_student.user_id ",
        { user_id, room_id, home_work_id },
      );

      student_home_works = await get_extra_data(student_home_works);

      res.send(student_home_works);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// Get student home_works  of a homework
router.get(
  "/home_work_student/room/:room_id/home_work/:home_work_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let home_work_id = req.params.home_work_id;
      let room_id = req.params.room_id;

      if (!(await OwnerShipChecker.is_room_admin(room_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      let student_home_works = await Thoth_DB.get_data(
        "select user_fullname,user_avatar,home_work_student.* from user,home_work_student where home_work_id=:home_work_id and  user.user_id= home_work_student.user_id order by home_work_student_id DESC ",
        { home_work_id },
      );

      student_home_works = await get_extra_data(student_home_works);

      res.send(student_home_works);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function get_extra_data(home_works) {
  for (const home_work_item of home_works) {
    let index = home_works.indexOf(home_work_item);
    home_work_item.user_avatar = `${Consts.stream_url}${home_work_item.user_avatar}`;
    home_work_item.audio_appreciation = `${Consts.stream_url}${home_work_item.audio_appreciation}`;
    home_work_item.files_urls = await get_files(home_work_item);
    home_work_item.images_url = await get_images(home_work_item);
    home_works[index] = home_work_item;
  }
  return home_works;
}

async function get_files(home_work_item) {
  try {
    let files = await Thoth_DB.get_data(
      `select * from home_work_student_file where home_work_student_id=${home_work_item.home_work_student_id}`,
    );
    let returner = [];
    for (const item of files) {
      let url = `${Consts.stream_url}${item.home_work_student_file_url}`;
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
      `select * from home_work_student_image where home_work_student_id=${home_work_item.home_work_student_id}`,
    );
    let returner = [];
    for (const item of images) {
      let url = `${Consts.stream_url}${item.home_work_student_image_url}`;
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

router.delete(
  "/home_work_student/:home_work_student_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let home_work_student_id = req.params.home_work_student_id;

      if (
        !(await OwnerShipChecker.check(
          "home_work_student",
          home_work_student_id,
          user_id,
        ))
      ) {
        res.sendStatus(401);
        return;
      }

      // Delete all the images from the server
      await delete_home_work_student_image(home_work_student_id);
      // Delete all the files from the server
      await delete_home_work_student_file(home_work_student_id);

      await Thoth_DB.delete_data(
        "delete from home_work_student where home_work_student_id=:home_work_student_id and user_id=:user_id",
        { home_work_student_id, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function delete_home_work_student_image(home_work_student_id) {
  let images = await Thoth_DB.get_data(
    "select * from home_work_student_image where home_work_student_id=:home_work_student_id",
    { home_work_student_id },
  );
  if (images.length == 0) return;
  for (const image of images) {
    Drive_Service.delete_file(image.home_work_student_image_url);
  }
}

async function delete_home_work_student_file(home_work_student_id) {
  let files = await Thoth_DB.get_data(
    "select * from home_work_student_file where home_work_student_id=:home_work_student_id",
    { home_work_student_id },
  );
  if (files.length == 0) return;
  for (const file of files) {
    Drive_Service.delete_file(file.home_work_student_file_url);
  }
}

// Add Correction to student home work
router.patch(
  "/add_appreciation/home_work_student/:home_work_student_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let home_work_student_id = req.params.home_work_student_id;
      let user_id = req.body.user_data.user_id;
      let { home_work_student_grade, room_id } = req.body;
      let home_work_student_appreciation =
        req.body.home_work_student_appreciation ?? "";
      let audio_duration = req.body.audio_duration ?? 0;
      let home_work_student_correction_date = new Date();
      let audio_appreciation = "";

      let fields_ok = Validator.validateFields(
        { home_work_student_grade, room_id },
        res,
      );
      if (!fields_ok) {
        return;
      }

      if (!OwnerShipChecker.is_room_admin(room_id, user_id)) {
        return res.sendStatus(200);
      }

      await Thoth_DB.update_data(
        "update home_work_student set home_work_student_appreciation=:home_work_student_appreciation,home_work_student_grade=:home_work_student_grade,audio_appreciation=:audio_appreciation,home_work_student_corrected=1,audio_duration=:audio_duration,home_work_student_correction_date=:home_work_student_correction_date where home_work_student_id=:home_work_student_id",
        {
          home_work_student_appreciation,
          home_work_student_grade,
          audio_appreciation,
          audio_duration,
          home_work_student_correction_date,
          home_work_student_id,
        },
      );

      //Notify user
      let rooms = await Thoth_DB.get_data(
        "select * from room where room_id=:room_id",
        { room_id },
      );
      if (rooms.length > 0) {
        let room_name = rooms[0].room_name;
        let homeWorkStudent = await Thoth_DB.get_data(
          "select * from home_work_student where home_work_student_id=:home_work_student_id",
          { home_work_student_id },
        );
        if (homeWorkStudent.length > 0) {
          let user_id = homeWorkStudent[0].user_id;
          let user_data = await User_Controller.get_user_data(user_id);
          let message = `Votre devoir sur ${room_name} a ete corrige, Vous avez une note de ${home_work_student_grade}`;
          NotifEngine.new(user_id, message);
          EmailService.sendEmail(
            user_data.user_email,
            "Devoir corrige",
            message,
          );
        }
      }

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

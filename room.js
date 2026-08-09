const express = require("express");
const router = express.Router();

const { Security } = require("../utils/security");
const { Validator } = require("../utils/validator");
const { HelperFunction } = require("../utils/helper_function");
const { HelperFile } = require("../utils/helper_file.js");
const { OwnerShipChecker } = require("../utils/ownership_checker.js");
const { Consts } = require("../consts.js");
const { serverError } = require("../utils/server_error.js");
const { Thoth_DB } = require("../thoth_db");
const Axios_Private = require("../utils/axios");
const { Model_Helper } = require("../utils/model_helper.js");
const { Drive_Service } = require("../services/drive/drive.js");
const { User_Controller } = require("../controllers/user_controller.js");

// Create a room
router.post("/room", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let room_avatar = Consts.room_avatar;
    let room_created_date = new Date();
    let { room_name, frais } = req.body;
    frais = parseInt(frais);
    if (isNaN(frais)) {
      frais = 0;
    }
    let code = HelperFunction.generate_activation_code();

    console.log(room_avatar);

    let field_ok = Validator.validateFields({ room_name }, res);
    if (!field_ok) {
      return;
    }

    // Check for avatar

    if (req.files != undefined) {
      if (req.files.file != undefined) {
        room_avatar = await Drive_Service.upload_file(
          req.files.file.name,
          req.files.file.data,
        );
      }
    }

    room_name = HelperFunction.Ucase(room_name);

    let room = await Thoth_DB.post_data(
      "insert into room(frais,user_id,room_name,room_avatar,room_created_date,code) values(:frais,:user_id,:room_name,:room_avatar,:room_created_date,:code)",
      {
        frais,
        user_id,
        room_name,
        room_avatar,
        room_created_date,
        code,
      },
    );

    let room_id = room[0];
    // set the user as a room admin
    await set_user_as_room_admin(room_id, user_id);
    // insert the top in the room
    await insert_user_in_room(room_id, user_id);
    // Create chat instance
    let chat_id = await HelperFunction.create_chat_instance();
    // update room to set chat instance
    await set_room_chat_instance(room_id, chat_id);
    res.send({ room_id });
  } catch (error) {
    serverError(error, res);
  }
});

router.patch(
  "/room-code/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let room_id = parseInt(req.params.room_id);
      let code = HelperFunction.generate_activation_code();
      await Thoth_DB.update_data(
        "update room set code=:code where room_id=:room_id and user_id=:user_id",
        {
          code,
          room_id,
          user_id,
        },
      );
      res.send({ code });
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/room-frais/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let room_id = parseInt(req.params.room_id);
      let frais = parseInt(req.body.frais);
      if (isNaN(frais)) {
        frais = 0;
      }
      await Thoth_DB.update_data(
        "update room set frais=:frais where room_id=:room_id and user_id=:user_id",
        {
          frais,
          room_id,
          user_id,
        },
      );
      res.send({ frais });
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.post(
  "/join-room-via-code",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let code = req.body.code;
      if (code.trim().length == 0) {
        return res.sendStatus(400);
      }
      let rooms = await Thoth_DB.get_data(
        "select * from room where code=:code",
        { code },
      );
      if (rooms.length == 0) return res.sendStatus(404);
      let owner_id = rooms[0].user_id;
      let room_id = rooms[0].room_id;
      let room_name = rooms[0].room_name;
      let frais = rooms[0].frais;

      let gain = (frais * 30) / 100;

      let user_data = await User_Controller.get_user_data(user_id);
      let balance = user_data.balance;
      if (balance + gain < frais) {
        return res.status(401).send({ solde_min: frais + gain });
      }

      let user_room_created_date = new Date();
      //check if user already in the room
      let data = await Thoth_DB.get_data(
        "select * from user_room where user_id=:user_id and room_id=:room_id",
        { user_id, room_id },
      );
      if (data.length == 0) {
        const expired_at = new Date();
        expired_at.setDate(expired_at.getDate() + 30);

        await Thoth_DB.post_data(
          "insert into user_room(expired_at,user_id,room_id,user_room_created_date) values(:expired_at,:user_id,:room_id,:user_room_created_date)",
          { expired_at, user_id, room_id, user_room_created_date },
        );
      }
      //debiter le compte du user
      let debit = frais + gain;
      await Thoth_DB.update_data(
        "update user set balance = balance - :debit where user_id=:user_id",
        { debit, user_id },
      );
      //augmenter le compte du createur du groupe
      await Thoth_DB.update_data(
        "update user set balance = balance + :frais where user_id=:owner_id",
        { frais, owner_id },
      );
      res.send({ room_name });
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/renew-room-abonnement/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let room_id = parseInt(req.params.room_id);
      let user_id = req.body.user_data.user_id;

      //check if the user has already subscribed to the room
      let rooms = await Thoth_DB.get_data(
        "select * from user_room where room_id=:room_id and user_id=:user_id and expired = 0",
        { room_id, user_id },
      );
      if (rooms.length > 0) return res.sendStatus(200);

      let user_data = await User_Controller.get_user_data(user_id);
      let room = await Thoth_DB.get_data(
        "select * from room where room_id=:room_id",
        { room_id },
      );
      if (room.length == 0) return res.sendStatus(404);
      let frais = room[0].frais + (room[0].frais * 30) / 100;

      if (frais > user_data.balance) {
        return res.sendStatus(401);
      }

      const expired_at = new Date();
      expired_at.setDate(expired_at.getDate() + 30);
      await Thoth_DB.update_data(
        "update user_room set  expired_at=:expired_at, expired = 0 where room_id=:room_id and user_id=:user_id",
        { expired_at, room_id, user_id },
      );

      //debiter l'utilisateur
      await Thoth_DB.update_data(
        "update user set balance = balance - :frais where user_id=:user_id",
        { frais, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function set_room_chat_instance(room_id, chat_id) {
  await Thoth_DB.update_data(
    "update room set chat_id=:chat_id where room_id=:room_id",
    { chat_id, room_id },
  );
}

async function set_user_as_room_admin(room_id, user_id) {
  let room_admin_created_date = new Date();
  await Thoth_DB.post_data(
    "insert into room_admin(user_id,room_id,room_admin_created_date) values(:user_id,:room_id,:room_admin_created_date)",
    {
      user_id,
      room_id,
      room_admin_created_date,
    },
  );
}

async function insert_user_in_room(room_id, user_id) {
  let user_room_created_date = new Date();
  await Thoth_DB.post_data(
    "insert into user_room(room_id,user_id,user_room_created_date) values(:room_id,:user_id,:user_room_created_date)",
    { room_id, user_id, user_room_created_date },
  );
}

// Edit room avatar
router.patch(
  "/room_avatar/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let room_id = req.params.room_id;
      if (!(await OwnerShipChecker.is_room_admin(room_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      if (!Validator.validateFilesInput(req, res)) {
        return;
      }

      if (!HelperFile.is_image(req.files.file)) {
        res.status(401).send({
          status: 400,
          msg: "Please provide a valid image file!",
        });
        return;
      }
      if (HelperFile.fileExceed10M(req.files.file)) {
        res.status(401).send({
          status: 400,
          msg: "The image size must not exceed 10M!",
        });
        return;
      }

      let room_avatar = await Drive_Service.upload_file(
        req.files.file.name,
        req.files.file.data,
      );

      await Thoth_DB.update_data(
        "update room set room_avatar =:room_avatar where room_id=:room_id",
        { room_avatar, room_id },
      );

      res.send({ room_avatar: `${Consts.stream_url}${room_avatar}` });
    } catch (error) {
      serverError(error, res);
    }
  },
);

// edit room name
router.patch(
  "/name_room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let room_id = req.params.room_id;
      let room_name = req.body.room_name ?? "";
      if (room_name.trim().length == 0) {
        return res.sendStatus(400);
      }
      room_name = HelperFunction.Ucase(room_name);
      await Thoth_DB.update_data(
        "update room set room_name=:room_name where room_id=:room_id and user_id=:user_id",
        { room_name, room_id, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// Delete room
router.delete(
  "/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let room_id = req.params.room_id;

      if (!(await OwnerShipChecker.check("room", room_id, user_id))) {
        return res.sendStatus(401);
      }

      await delete_room_avatar(room_id);
      await Thoth_DB.delete_data(
        "delete from room where room_id=:room_id and user_id=:user_id",
        { room_id, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function delete_room_avatar(room_id) {
  let rooms = await Thoth_DB.get_data(
    "Select * from room where room_id=:room_id",
    { room_id },
  );
  if (rooms.length == 0) return;
  let room_avatar = rooms[0].room_avatar;
  if (room_avatar == Consts.room_avatar) return;
  Drive_Service.delete_file(room_avatar);
}

// Search a room
router.get(
  "/search_rooms/:token",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let token = req.params.token;

      let rooms = await Thoth_DB.get_data(
        `select * from room,user_room where room_name like '%${token}%' and room.room_id = user_room.room_id and user_room.user_id = ${user_id}`,
      );

      for (const room of rooms) {
        room.room_avatar = `${Consts.stream_url}${room.room_avatar}`;
      }

      res.send(rooms);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get the names of the members of a group
router.get(
  "/members/room/:room_id/offset/:offset",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let room_id = req.params.room_id;
      let limit = 10;
      let offset = parseInt(req.params.offset);

      if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      let user_ids = await Thoth_DB.get_data(
        "select user_id from user_room where room_id=:room_id limit :limit offset :offset",
        { room_id, limit, offset },
      );

      let users = [];
      for (const user_item of user_ids) {
        let user = await Model_Helper.get_user_data_by_id(
          user_item.user_id,
          user_id,
        );
        users.push(user);
      }

      res.send(users);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// search users in a room
router.get(
  "/search_users_room/:room_id/token/:search_token",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let room_id = req.params.room_id;
      let search_token = req.params.search_token;
      let user_ids = await Thoth_DB.get_data(
        `select user_room.user_id from user_room,user where room_id=:room_id and user.user_fullname LIKE '%${search_token}%' and user.user_id = user_room.user_id `,
        { room_id },
      );

      let users = [];
      for (const user_item of user_ids) {
        let user = await Model_Helper.get_user_data_by_id(
          user_item.user_id,
          req.body.user_data.user_id,
        );
        users.push(user);
      }

      res.send(users);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get room item
router.get("/room/:room_id", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let room_id = req.params.room_id;
    let rooms = await Thoth_DB.get_data(
      "select user_fullname as tutor,room.* from room,user where room_id=:room_id and room.user_id = user.user_id",
      { room_id },
    );
    if (rooms.length == 0) {
      return res.send({});
    }
    if (rooms[0].room_avatar && rooms[0].room_avatar.trim().length > 0) {
      rooms[0].room_avatar = `${Consts.stream_url}${rooms[0].room_avatar}`;
    }
    rooms[0].total_student = await Model_Helper.get_total_students(room_id);
    rooms[0].total_home_work = 0;
    rooms[0].is_admin = await Model_Helper.is_room_admin(room_id, user_id);
    res.send(rooms[0]);
  } catch (error) {
    serverError(error, res);
  }
});

router.get(
  "/is_admin/room/:room_id/user/:user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let room_id = req.params.room_id;
      let user_id = req.params.user_id;
      let is_admin = await OwnerShipChecker.is_room_admin(room_id, user_id);
      res.send({ is_admin });
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.delete(
  "/quit_room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let room_id = req.params.room_id;

      await Thoth_DB.delete_data(
        "delete from user_room where user_id=:user_id and room_id =:room_id",
        { user_id, room_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//delete subject
router.delete(
  "/room-subject/room/:room_id/subject/:subject_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let room_id = parseInt(req.params.room_id);
      let subject_id = parseInt(req.params.subject_id);
      let user_id = req.body.user_data.user_id;
      //check if the user is the admin of the room
      let admins = await Thoth_DB.get_data(
        "select * from room_admin where user_id=:user_id and room_id=:room_id",
        {
          user_id,
          room_id,
        },
      );
      if (admins.length == 0) return res.sendStatus(401);
      let subjects = await Thoth_DB.get_data(
        "select * from subject where subject_id = :subject_id and room_id=:room_id",
        { subject_id, room_id },
      );
      if (subjects.length == 0) return res.sendStatus(401);
      //Delete associated cours
      await Thoth_DB.delete_data(
        "delete from cours where subject_id=:subject_id",
        { subject_id },
      );
      //Delete associated fiches
      await Thoth_DB.delete_data(
        "delete from flashcard where subject_id=:subject_id",
        { subject_id },
      );
      //Delete associated quiz
      await Thoth_DB.delete_data(
        "delete from quiz where subject_id=:subject_id",
        { subject_id },
      );
      await Thoth_DB.delete_data(
        "delete from subject where subject_id = :subject_id and room_id=:room_id",
        {
          subject_id,
          room_id,
        },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//delete chapter

router.delete(
  "/room-chapter/room/:room_id/chapter/:chapter_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let room_id = parseInt(req.params.room_id);
      let chapter_id = parseInt(req.params.chapter_id);
      let user_id = req.body.user_data.user_id;
      //check if the user is the admin of the room
      let admins = await Thoth_DB.get_data(
        "select * from room_admin where user_id=:user_id and room_id=:room_id",
        {
          user_id,
          room_id,
        },
      );
      if (admins.length == 0)
        return res.status(401).send("Vous n'etes pas admin de cette salle!");
      let chapters = await Thoth_DB.get_data(
        "select * from chapter where chapter_id = :chapter_id and room_id=:room_id",
        { chapter_id, room_id },
      );
      if (chapters.length == 0)
        return res.status(401).send("Ce chapitre n'existe pas!");
      //Delete associated cours
      await Thoth_DB.delete_data(
        "delete from cours where chapter_id=:chapter_id",
        { chapter_id },
      );
      //Delete associated fiches
      await Thoth_DB.delete_data(
        "delete from flashcard where chapter_id=:chapter_id",
        { chapter_id },
      );
      //Delete associated quiz
      await Thoth_DB.delete_data(
        "delete from quiz where chapter_id=:chapter_id",
        { chapter_id },
      );
      await Thoth_DB.delete_data(
        "delete from chapter where chapter_id = :chapter_id and room_id=:room_id",
        {
          chapter_id,
          room_id,
        },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//edit subject room
router.patch(
  "/subject/:subject_id/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let subject_id = parseInt(req.params.subject_id);
      let room_id = parseInt(req.params.room_id);
      let user_id = req.body.user_data.user_id;
      let subject_name = req.body.subject_name;
      //check if the user is the admin of the room
      let admins = await Thoth_DB.get_data(
        "select * from room_admin where user_id=:user_id and room_id=:room_id",
        {
          user_id,
          room_id,
        },
      );
      if (admins.length == 0) return res.sendStatus(401);
      await Thoth_DB.update_data(
        "update subject set subject_name=:subject_name where subject_id=:subject_id and room_id=:room_id",
        {
          subject_id,
          room_id,
          subject_name,
        },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//edit chapter room
router.patch(
  "/chapter/:chapter_id/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let chapter_id = parseInt(req.params.chapter_id);
      let room_id = parseInt(req.params.room_id);
      let user_id = req.body.user_data.user_id;
      let chapter_name = req.body.chapter_name;
      //check if the user is the admin of the room
      let admins = await Thoth_DB.get_data(
        "select * from room_admin where user_id=:user_id and room_id=:room_id",
        {
          user_id,
          room_id,
        },
      );
      if (admins.length == 0) return res.sendStatus(401);
      await Thoth_DB.update_data(
        "update chapter set chapter_name=:chapter_name where chapter_id=:chapter_id and room_id=:room_id",
        {
          chapter_id,
          room_id,
          chapter_name,
        },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

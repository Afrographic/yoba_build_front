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
const { SMS_Service } = require("../services/sms_service.js");
const { EmailService } = require("../services/email_service.js");
const {
  Notification_Controller,
} = require("../controllers/notification_controller.js");
const { Offre_Controller } = require("../controllers/offre_controller.js");
const { User_Controller } = require("../controllers/user_controller.js");
const { Chat_Controller } = require("../controllers/chat_controller.js");

router.post(
  "/signal_user_chat",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let chat_id = req.body.chat_id;
      let user_id = req.body.user_id;
      let signals = await DB.get_data(
        "select * from signal_chat where chat_id=:chat_id and user_id=:user_id",
        { chat_id, user_id }
      );
      if (signals.length > 0) {
        return res.sendStatus(200);
      }
      await DB.post_data(
        "insert into signal_chat(chat_id,user_id) values(:chat_id,:user_id)",
        { chat_id, user_id }
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  }
);

router.get(
  "/signal_chat",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let chats = await DB.get_data("select * from signal_chat ");
      for (let i = 0; i <= chats.length - 1; i++) {
        chats[i].contact_info = await User_Controller.get_basic_info(
          chats[i].user_id
        );
        chats[i].is_admin = await User_Controller.is_admin(chats[i].user_id);
        chats[i].total_message = await Chat_Controller.get_total_message(
          chats[i].chat_id
        );
      }
      res.send(chats);
    } catch (error) {
      serverError(error, res);
    }
  }
);

router.get(
  "/ignore_signal_chat/:chat_id/:user_id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let chat_id = parseInt(req.params.chat_id);
      let user_id = parseInt(req.params.user_id);
      await DB.delete_data(
        "delete from signal_chat where chat_id=:chat_id and user_id=:user_id",
        { chat_id, user_id }
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  }
);

router.delete(
  "/delete_signaled_user/:chat_id/:user_id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let chat_id = parseInt(req.params.chat_id);
      let user_id = parseInt(req.params.user_id);
      //Delete offre
      await DB.delete_data("delete from offre where user_id=:user_id", {
        user_id,
      });
      await DB.delete_data("delete from user where user_id=:user_id", {
        user_id,
      });
      await DB.delete_data("delete from chat where chat_id=:chat_id", {
        chat_id,
      });
      //
      await DB.delete_data(
        "delete from signal_chat where chat_id=:chat_id and user_id=:user_id",
        { chat_id, user_id }
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  }
);

router.get(
  "/ignore_signal_user/:chat_id/:user_id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let chat_id = parseInt(req.params.chat_id);
      let user_id = parseInt(req.params.user_id);
      await DB.delete_data(
        "delete from signal_chat where chat_id=:chat_id and user_id=:user_id",
        { chat_id, user_id }
      );
      res.sendStatus(200);
    } catch (error) {  
      serverError(error, res);
    }
  }
);

module.exports = router;

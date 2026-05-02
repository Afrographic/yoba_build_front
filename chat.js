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
const { User_Controller } = require("../controllers/user_controller.js");
const { Chat_Controller } = require("../controllers/chat_controller.js");

router.get(
  "/mark_all_messages_as_read/:chat_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let chat_id = parseInt(req.params.chat_id);
      let user_id = req.body.user_data.user_id;
      await DB.update_data(
        "update chat_message set is_read = 1 where chat_id=:chat_id and user_id<>:user_id ",
        { chat_id,user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get("/contacts", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let chats = await DB.get_data(
      "select * from chat where user_id=:user_id or with_user_id=:user_id ",
      { user_id },
    );
    let chats_to_send = [];
    for (let i = 0; i <= chats.length - 1; i++) {
      if (chats[i].with_user_id != 0) {
        if (chats[i].user_id != user_id) {
          chats[i].contact_info = await User_Controller.get_basic_info(
            chats[i].user_id,
          );
          chats[i].is_admin = await User_Controller.is_admin(chats[i].user_id);
        }
        if (chats[i].with_user_id != user_id) {
          chats[i].contact_info = await User_Controller.get_basic_info(
            chats[i].with_user_id,
          );
          chats[i].is_admin = await User_Controller.is_admin(
            chats[i].with_user_id,
          );
        }
        if (chats[i].contact_info != undefined) {
          chats[i].total_unread = await Chat_Controller.count_total_unread(
            chats[i].chat_id,
            user_id,
          );
          chats[i].recent_message = await Chat_Controller.get_recent_message(
            chats[i].chat_id,
          );
          chats_to_send.push(chats[i]);
        }
      }
    }
    res.send(Chat_Controller.sortMessages(chats_to_send));
  } catch (error) {
    serverError(error, res);
  }
});

router.get(
  "/get_chat_id/:with_user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let with_user_id = parseInt(req.params.with_user_id);
      if (user_id == with_user_id) return res.sendStatus(403);
      let chats = await DB.get_data(
        "select chat_id from chat where (user_id=:user_id and with_user_id=:with_user_id) or (user_id=:with_user_id and with_user_id =:user_id)",
        { user_id, with_user_id },
      );
      if (chats.length == 0) {
        let insert = await DB.post_data(
          "insert into chat(user_id,with_user_id) values(:user_id,:with_user_id)",
          { user_id, with_user_id },
        );
        res.send({ chat_id: insert[0] });
      } else {
        res.send({ chat_id: chats[0].chat_id });
      }
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.post("/message", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let message = req.body.message;
    let chat_id = req.body.chat_id;
    let reply_id = req.body.reply_id;
    let created_at = new Date();

    let audio_url = "";
    let file_url = "";

    //Create comment chat id
    let chat = await DB.post_data(
      "insert into chat(user_id,with_user_id) values(:user_id,:with_user_id)",
      {
        user_id: user_id,
        with_user_id: 0,
      },
    );
    let comment_chat_id = chat[0];

    let insert = await DB.post_data(
      "insert into chat_message(user_id,message,chat_id,created_at,reply_id,comment_chat_id) values(:user_id,:message,:chat_id,:created_at,:reply_id,:comment_chat_id)",
      { user_id, message, chat_id, created_at, reply_id, comment_chat_id },
    );

    let chat_message_id = insert[0];
    let images = [];
    let token = HelperFunction.generate4DigitsCode();
    if (req.files != undefined) {
      for (const key in req.files) {
        let file = req.files[key];
        file.mv(
          `./public/backend_files/chat_${chat_id}${token}${HelperFunction.replace_space_with_underscore(
            file.name,
          )}`,
        );
        let url = `${
          Consts.backend_host
        }/backend_files/chat_${chat_id}${token}${HelperFunction.replace_space_with_underscore(
          file.name,
        )}`;

        if (req.body.file_title.trim().length > 0) {
          let size = file.size;
          let extension = HelperFunction.get_extension(file.name);
          let name_file = req.body.file_title;
          await DB.post_data(
            "insert into chat_file(size,name_file,extension,chat_message_id,url) values(:size,:name_file,:extension,:chat_message_id,:url)",
            { size, name_file, extension, chat_message_id, url },
          );
          file_url = url;
        } else {
          if (req.body.is_audio == 0) {
            await DB.post_data(
              "insert into chat_image(chat_message_id,url) values(:chat_message_id,:url)",
              { chat_message_id, url },
            );
            images.push({ url });
          } else {
            await DB.post_data(
              "insert into chat_audio(chat_message_id,url) values(:chat_message_id,:url)",
              { chat_message_id, url },
            );
            audio_url = url;
          }
        }
      }
    }
    res.send({
      chat_message_id: chat_message_id,
      images: images,
      audio_url: audio_url,
      file_url: file_url,
    });
  } catch (error) {
    serverError(error, res);
  }
});

router.delete(
  "/chat_message/:chat_message_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let chat_message_id = parseInt(req.params.chat_message_id);
      let images = await DB.get_data(
        "select * from chat_image where chat_message_id=:chat_message_id ",
        { chat_message_id },
      );
      for (const image of images) {
        HelperFile.deleteFileFromServer(image.url);
      }
      await DB.delete_data(
        "delete from chat_message where chat_message_id=:chat_message_id and user_id=:user_id",
        { chat_message_id, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get(
  "/messages/:chat_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let chat_id = parseInt(req.params.chat_id);
      let messages = await DB.get_data(
        "select * from chat_message where chat_id=:chat_id",
        { chat_id },
      );
      for (let i = 0; i <= messages.length - 1; i++) {
        messages[i].images = await Chat_Controller.get_images(
          messages[i].chat_message_id,
        );
        messages[i].user_info = await User_Controller.get_basic_info(
          messages[i].user_id,
        );
        messages[i].audio_url = await Chat_Controller.get_audio_url(
          messages[i].chat_message_id,
        );
        messages[i].files = await Chat_Controller.get_file_url(
          messages[i].chat_message_id,
        );
        messages[i].reply_message = await Chat_Controller.get_reply_message(
          messages[i].reply_id,
        );
        messages[i].total_comments = await Chat_Controller.count_total_message(
          messages[i].comment_chat_id,
        );
        messages[i].reactions = await Chat_Controller.get_reactions(
          messages[i].chat_message_id,
        );
      }
      res.send(messages);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/edit_message/:chat_message_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let chat_message_id = req.params.chat_message_id;
      let message = req.body.message;
      await DB.update_data(
        "update chat_message set message=:message where user_id=:user_id and chat_message_id=:chat_message_id",
        { message, user_id, chat_message_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// Ajouter une reaction
router.post("/reaction", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let image_id = req.body.image_id;
    let chat_message_id = req.body.chat_message_id;
    let created_at = new Date();
    //Check if already reacted
    let data = await DB.get_data(
      "select * from chat_message_reaction where user_id=:user_id and chat_message_id=:chat_message_id",
      { user_id, chat_message_id },
    );
    if (data.length > 0) {
      // remove the existing reaction
      await DB.delete_data(
        "delete from chat_message_reaction where  user_id=:user_id and chat_message_id=:chat_message_id",
        { user_id, chat_message_id },
      );
    }
    // add the new reaction
    await DB.post_data(
      "insert into chat_message_reaction(image_id,chat_message_id,user_id,created_at) values(:image_id,:chat_message_id,:user_id,:created_at)",
      { image_id, chat_message_id, user_id, created_at },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

//Remove a reaction
router.delete(
  "/reaction/:chat_message_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let chat_message_id = parseInt(req.params.chat_message_id);
      await DB.delete_data(
        "delete from chat_message_reaction where chat_message_id =:chat_message_id and user_id=:user_id",
        { chat_message_id, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

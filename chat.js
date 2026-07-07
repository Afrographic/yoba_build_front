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
const {
  CommuanuteController,
} = require("../controllers/communaute_controller.js");
const { PushService } = require("../services/pushService.js");
const { Offre_Controller } = require("../controllers/offre_controller.js");
const Real_Time = require("../services/real_time.js");

router.get(
  "/mark_all_messages_as_read/:chat_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let chat_id = parseInt(req.params.chat_id);
      let user_id = req.body.user_data.user_id;
      await DB.update_data(
        "update chat_message set is_read = 1 where chat_id=:chat_id and user_id<>:user_id ",
        { chat_id, user_id },
      );
       Real_Time.socket
        .to("user-" + user_id)
        .emit("new_contact", "user-" + user_id);
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get("/contacts", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let contacts = await Chat_Controller.getUserContact(user_id);
    res.send(Chat_Controller.sortMessages(contacts));
  } catch (error) {
    serverError(error, res);
  }
});

router.get("/total_unread", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let contacts = await Chat_Controller.getUserContact(user_id);
    let communautes = await CommuanuteController.getUserCommunity(user_id);
    contacts = contacts.concat(communautes);
    let totalUnread = 0;
    for (const item of contacts) {
      totalUnread += item.total_unread;
    }
    res.send({ total: totalUnread });
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
      Real_Time.socket
        .to("user-" + user_id)
        .emit("new_contact", "user-" + user_id);
      Real_Time.socket
        .to("user-" + with_user_id)
        .emit("new_contact", "user-" + with_user_id);
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
    let offre_id = req.body.offre_id == "undefined" ? 0 : req.body.offre_id;
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
      "insert into chat_message(offre_id,user_id,message,chat_id,created_at,reply_id,comment_chat_id) values(:offre_id,:user_id,:message,:chat_id,:created_at,:reply_id,:comment_chat_id)",
      {
        offre_id,
        user_id,
        message,
        chat_id,
        created_at,
        reply_id,
        comment_chat_id,
      },
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

    //Send Receiver notification
    PushService.newMessagePushNotification(chat_id, user_id, message);

    Real_Time.socket
        .to("user-" + user_id)
        .emit("new_contact", "user-" + user_id);

    res.send({
      chat_message_id: chat_message_id,
      images: images,
      audio_url: audio_url,
      file_url: file_url,
      comment_chat_id: comment_chat_id,
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
      let user_id = req.body.user_data.user_id;
      let messages = await DB.get_data(
        "select * from chat_message where chat_id=:chat_id order by chat_message_id DESC limit 100",
        { chat_id },
      );
      messages.reverse();
      for (let i = 0; i <= messages.length - 1; i++) {
        messages[i].full_message = messages[i].message;
        messages[i].message = messages[i].full_message.substring(0,300);
        messages[i].show_more = messages[i].full_message.length > 300;
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
        messages[i].offre = await Offre_Controller.get_offre_item(
          user_id,
          messages[i].offre_id,
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

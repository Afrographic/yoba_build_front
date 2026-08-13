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

// pin a message
router.post("/comment_pinned", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let created_date = new Date();
    let { chat_id, comment_id } = req.body;

    let fields_ok = Validator.validateFields({ chat_id, comment_id }, res);
    if (!fields_ok) {
      return;
    }

    await Thoth_DB.post_data(
      "insert into comment_pinned(chat_id,comment_id,user_id,created_date) values(:chat_id,:comment_id,:user_id,:created_date)",
      { chat_id, comment_id, user_id, created_date },
    );

    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

// get pinned messages
router.get(
  "/pinned_message/chat/:chat_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let chat_id = req.params.chat_id;

      let messages = await Thoth_DB.get_data(
        "select user_avatar,user_fullname,comment.*,comment_pinned.* from user,comment,comment_pinned where comment_pinned.chat_id = :chat_id and comment_pinned.user_id = :user_id and  comment_pinned.comment_id = comment.comment_id and comment.user_id = user.user_id ",
        { chat_id, user_id },
      );

      for (const message of messages) {
        if (message.user_avatar) {
          message.user_avatar = `${Consts.stream_url}${message.user_avatar}`;
        }
      }

      res.send(messages);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// unpin a message
router.delete(
  "/comment_pinned/:comment_pinned_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let comment_pinned_id = req.params.comment_pinned_id;

      if (
        !(await OwnerShipChecker.is_comment_pinned_owner(
          comment_pinned_id,
          user_id,
        ))
      ) {
        res.sendStatus(401);
        return;
      }

      await Thoth_DB.delete_data(
        "delete from comment_pinned where comment_pinned_id=:comment_pinned_id",
        { comment_pinned_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);
module.exports = router;

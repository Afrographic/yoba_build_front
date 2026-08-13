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
const { WebScrapper } = require("./WebScrapper.js");
const { Model_Helper } = require("../utils/model_helper.js");
const { Drive_Service } = require("../services/drive/drive.js");
const { User_Controller } = require("../controllers/user_controller.js");
const { NotifEngine } = require("../services/NotifEngine.js");
const { PushService } = require("../services/pushService.js");
const { CommentService } = require("../controllers/comment_service.js");

// save a text comment
router.post("/comment", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let comment_created_date = new Date();
    let { comment_reply_id, chat_id } = req.body;
    let comment_contenu = req.body.comment_contenu ?? "";
    let rich_text = req.body.rich_text ?? "";

    let fields_ok = Validator.validateFields({ chat_id }, res);
    if (!fields_ok) {
      return;
    }

    let comment;

    if (parseInt(comment_reply_id) == 0) {
      comment = await Thoth_DB.post_data(
        "insert into comment(rich_text,comment_contenu,comment_created_date,chat_id,user_id) values(:rich_text,:comment_contenu,:comment_created_date,:chat_id,:user_id)",
        {
          rich_text,
          comment_contenu,
          comment_created_date,
          chat_id,
          user_id,
        },
      );
    }

    if (parseInt(comment_reply_id) > 0) {
      comment = await Thoth_DB.post_data(
        "insert into comment(rich_text,comment_contenu,comment_created_date,comment_reply_id,chat_id,user_id) values(:rich_text,:comment_contenu,:comment_created_date,:comment_reply_id,:chat_id,:user_id)",
        {
          rich_text,
          comment_contenu,
          comment_created_date,
          comment_reply_id,
          chat_id,
          user_id,
        },
      );
    }

    CommentService.notifyAllConcernedPeople(user_id, chat_id, comment_contenu);
    let comment_id = comment[0];
    let comments = await Thoth_DB.get_data(
      "select * from comment where comment_id=:comment_id",
      { comment_id },
    );
    comments[0] = await CommentService.getCommentMetaData(comments[0]);

    res.send({ comment_id: comment_id, comment: comments[0] });
  } catch (error) {
    serverError(error, res);
  }
});



// get a single comment
router.get(
  "/comment/:comment_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let comment_id = req.params.comment_id;
      let comments = await Thoth_DB.get_data(
        "select user_avatar,user_fullname,comment.* from comment,user where comment_id=:comment_id and comment.user_id = user.user_id",
        { comment_id },
      );
      if (comments.length == 0) {
        res.sendStatus(404);
        return;
      }
      comments[0] = await CommentService.getCommentMetaData(comments[0]);
      res.send(comments[0]);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// Get the comments of a chat
router.get(
  "/comment/chat/:chat_id/offset/:offset",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let chat_id = req.params.chat_id;
      let offset = parseInt(req.params.offset);
      let limit = 20;

      let comments = await Thoth_DB.get_data(
        "select user_avatar,user_fullname,comment.* from comment,user where chat_id=:chat_id and comment.user_id = user.user_id order by comment_id DESC limit :limit offset :offset ",
        { chat_id, limit, offset },
      );
      // Compute elapsed time
      // get all the images
      // get all the files
      // get all the audios

      for (let i = 0; i <= comments.length - 1; i++) {
        comments[i] = await CommentService.getCommentMetaData(comments[i]);
      }

      comments.reverse();

      res.send(comments);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get total messages of a chat
router.get(
  "/total_message/:chat_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let chat_id = req.params.chat_id;
      let total = await Thoth_DB.get_data(
        "select count(*) as total from comment where chat_id=:chat_id",
        { chat_id },
      );

      res.send({ total: total[0].total });
    } catch (error) {
      serverError(error, res);
    }
  },
);

// Search a comment
router.get(
  "/search/chat/:chat_id/token/:token",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let chat_id = req.params.chat_id;
      let token = req.params.token;

      let comments = await Thoth_DB.get_data(
        `select user_avatar,user_fullname,comment.* from comment where chat_id=${chat_id} and comment.comment_contenu like '%${token}%'`,
      );

      for (const comment of comments) {
        if (comment.user_avatar) {
          comment.user_avatar = `${Consts.stream_url}${comment.user_avatar}`;
        }
      }

      res.send(comments);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// delete comment
router.delete(
  "/comment/:comment_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let comment_id = req.params.comment_id;
      let user_id = req.body.user_data.user_id;

      if (!(await OwnerShipChecker.check("comment", comment_id, user_id))) {
        res.sendStatus(401);
        return;
      }

      await delete_comment_files(comment_id);
      await delete_comment_voices(comment_id);
      await delete_comment_images(comment_id);

      await Thoth_DB.delete_data(
        "delete from comment where comment_id=:comment_id and user_id = :user_id",
        { comment_id, user_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function delete_comment_files(comment_id) {
  let comments_files = await Thoth_DB.get_data(
    "select * from comment_file where comment_id=:comment_id",
    { comment_id },
  );

  if (comments_files.length == 0) return;
  for (const comment_file of comments_files) {
    await Drive_Service.delete_file(comment_file.comment_file_url);
  }
}

async function delete_comment_voices(comment_id) {
  let comments_voices = await Thoth_DB.get_data(
    "select * from comment_voice where comment_id=:comment_id",
    { comment_id },
  );
  if (comments_voices.length == 0) return;
  for (const comment_voice of comments_voices) {
    await Drive_Service.delete_file(comment_voice.comment_voice_url);
  }
}

async function delete_comment_images(comment_id) {
  let comments_images = await Thoth_DB.get_data(
    "select * from comment_image where comment_id=:comment_id",
    { comment_id },
  );
  if (comments_images.length == 0) return;
  for (const comment_image of comments_images) {
    await Drive_Service.delete_file(comment_image.comment_image_url);
  }
}

// edit comment_text
router.patch(
  "/comment_contenu/:comment_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let comment_id = req.params.comment_id;
      let comment_contenu = req.body.comment_contenu ?? "";
      await Thoth_DB.update_data(
        "update comment set comment_contenu=:comment_contenu where comment_id=:comment_id and user_id=:user_id",
        { comment_contenu, comment_id, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// edit comment rich text
router.patch(
  "/comment-rich-text/:comment_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let comment_id = req.params.comment_id;
      let rich_text = req.body.rich_text ?? "";
      await Thoth_DB.update_data(
        "update comment set rich_text=:rich_text where comment_id=:comment_id and user_id=:user_id",
        { rich_text, comment_id, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.post("/commentImage", async (req, res) => {
  let idQuestion = parseInt(req.body.idQuestion);
  let images = req.files;
  let imagesArray = [];
  for (const property in images) {
    let imageItem = images[property];
    imagesArray.push(imageItem);
  }

  for (const imageItem of imagesArray) {
    let path = services.uploadFile("images/comment_images", imageItem);
    await insertCommentImage(idQuestion, path);
  }

  console.log("I am done");

  res.send("Images saved!");
});

async function insertCommentImage(idComment, path_image) {
  await Thoth_DB.query(
    "insert into commentimage (idComment,path_image) values(:idComment,:path_image)",
    {
      replacements: {
        idComment: idComment,
        path_image: path_image,
      },
      type: Thoth_DB.QueryTypes.INSERT,
    },
  );
}

router.post("/likeComment", async (req, res) => {
  let idComment = parseInt(req.body.idComment);
  let idUser = parseInt(req.body.idUser);

  // check if already exist
  let likes = await Thoth_DB.query(
    "select * from comment_like where commentId=:commentId and idUser=:idUser",
    {
      replacements: {
        commentId: idComment,
        idUser: idUser,
      },
      type: Thoth_DB.QueryTypes.SELECT,
    },
  );

  if (likes.length == 0) {
    // liking
    await Thoth_DB.query(
      "insert into comment_like (commentId,idUser) values(:commentId,:idUser)",
      {
        replacements: {
          commentId: idComment,
          idUser: idUser,
        },
        type: Thoth_DB.QueryTypes.INSERT,
      },
    );
    let totalLikes = await getTotalLike(idComment);
    res.send({ totalLikes });
  } else {
    // Removing the like
    await Thoth_DB.query(
      "delete from comment_like where commentId=:commentId and idUser=:idUser",
      {
        replacements: {
          commentId: idComment,
          idUser: idUser,
        },
        type: Thoth_DB.QueryTypes.DELETE,
      },
    );
    let totalLikes = await getTotalLike(idComment);
    res.send({ totalLikes });
  }
});

async function getTotalLike(idComment) {
  // check if already exist
  let likes = await Thoth_DB.query(
    "select * from comment_like where commentId=:commentId",
    {
      replacements: {
        commentId: idComment,
      },
      type: Thoth_DB.QueryTypes.SELECT,
    },
  );

  return likes.length;
}

router.get("/likes/:idComment", async (req, res) => {
  let idComment = parseInt(req.params.idComment);
  let likes = await getTotalLike(idComment);
  res.send({ likes });
});

router.get("/totalComment/:idQuestion", async (req, res) => {
  let idQuestion = parseInt(req.params.idQuestion);
  let totalComment = await comment.count({
    where: {
      QuestionId: idQuestion,
    },
  });
  res.send({ totalComment });
});

router.get("/lastCommentId/:idUser", async (req, res) => {
  let idUser = parseInt(req.params.idUser);
  let lastCommentId = await comment.findOne({
    attributes: ["id"],
    where: {
      UserId: idUser,
    },
    order: [["id", "DESC"]],
  });
  res.send(lastCommentId);
});

router.post("/previewURL", async (req, res) => {
  let url = req.body.url;
  let previewImage = await WebScrapper.getWEbsitePreview(url);
  res.send({ previewImage });
});

router.delete("/comment/:idComment", async (req, res) => {
  let idComment = parseInt(req.params.idComment);
  await Thoth_DB.query(`delete from comments where id = ${idComment}`);
  res.send("Comment deleted");
});

router.post("/pin", async (req, res) => {
  try {
    let idComment = JSON.parse(req.body.idComment);
    let idQuestion = JSON.parse(req.body.idQuestion);
    let idUser = JSON.parse(req.body.idUser);

    let alreadyPinned = await checkIfAlreadyPinned(idComment);
    if (alreadyPinned) {
      unpinned(idComment, res);
    } else {
      await Thoth_DB.query(
        "insert into pinnedmessage(idQuestion,idComment,idUser) values(:idQuestion,:idComment,:idUser)",
        {
          replacements: {
            idComment,
            idQuestion,
            idUser,
          },
        },
      );

      res.send({
        status: 200,
        msg: "Message pinned Succesfully",
      });
    }
  } catch (error) {
    console.log(error);
    res.send({
      status: 504,
      msg: "Internal Server error",
    });
  }
});

async function unpinned(idComment, res) {
  await Thoth_DB.query(
    "delete from pinnedmessage where idComment = :idComment",
    {
      replacements: {
        idComment,
      },
    },
  );
  res.send({
    status: 200,
    msg: "Message unpined Succesfully",
  });
}

async function checkIfAlreadyPinned(idComment) {
  let pinned = await Thoth_DB.query(
    "select * from pinnedmessage where idComment = :idComment",
    {
      replacements: {
        idComment,
      },
      type: Thoth_DB.QueryTypes.SELECT,
    },
  );

  return pinned.length > 0;
}

router.get("/countPinned/:idQuestion", async (req, res) => {
  let idQuestion = JSON.parse(req.params.idQuestion);
  let total = await Thoth_DB.query(
    "select count(*) as total from pinnedMessage where idQuestion=:idQuestion",
    {
      replacements: {
        idQuestion,
      },
      type: Thoth_DB.QueryTypes.SELECT,
    },
  );

  console.log(total);

  res.send({
    status: 200,
    msg: "Yeah i have count all",
    total: parseInt(total[0].total),
  });
});

module.exports = router;

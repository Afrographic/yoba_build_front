const express = require("express");
const { Thoth_DB } = require("../thoth_db");
const { HelperFile } = require("../utils/helper_file");
const { HelperFunction } = require("../utils/helper_function");
const { OwnerShipChecker } = require("../utils/ownership_checker");
const { Security } = require("../utils/security");
const { serverError } = require("../utils/server_error");
const { Validator } = require("../utils/validator");
const { Drive_Service } = require("../services/drive/drive");
const { Consts } = require("../consts");
const { User_Controller } = require("../controllers/user_controller");
const { NotifEngine } = require("../services/NotifEngine");
const router = express.Router();

// Create a topic
router.post("/topic", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let owner_user_id = user_id;

    let topic_created_date = new Date();
    let { room_id, rich_text } = req.body;

    if (!(await OwnerShipChecker.user_belong_to_room(room_id, user_id))) {
      res.sendStatus(401);
      return;
    }

    let chat_id = await HelperFunction.create_chat_instance();

    let data = await Thoth_DB.post_data(
      "insert into topic(rich_text,room_id,user_id,chat_id,topic_created_date) values(:rich_text,:room_id,:user_id,:chat_id,:topic_created_date)",
      { rich_text, room_id, user_id, chat_id, topic_created_date },
    );

    let topic_id = data[0];

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
          let message = `Cher ${user_data.user_fullname}, Un nouveau sujet a ete cree dans le  forum de votre  salle ${room_name}`;
          NotifEngine.new(user_id, message);
        }
      }
    }

    res.send({ topic_id, chat_id });
  } catch (error) {
    serverError(error, res);
  }
});

// add image to topic
router.patch(
  "/add_image/topic/:topic_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let topic_id = req.params.topic_id;

      if (!(await OwnerShipChecker.is_topic_owner(topic_id, user_id))) {
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

      await delete_topic_image_from_server(topic_id);

      let topic_image = await Drive_Service.upload_file(
        req.files.file.name,
        req.files.file.data,
      );
      await Thoth_DB.update_data(
        "update topic set topic_image=:topic_image where topic_id=:topic_id",
        {
          topic_image,
          topic_id,
        },
      );

      res.send({ topic_image: `${Consts.stream_url}${topic_image}` });
    } catch (error) {
      serverError(error, res);
    }
  },
);

// edit topic content:
router.patch(
  "/topic_content/topic/:topic_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let topic_id = req.params.topic_id;
      let user_id = req.body.user_data.user_id;

      let { rich_text } = req.body;
     

      rich_text = HelperFunction.Ucase(rich_text);
      await Thoth_DB.update_data(
        "update topic set rich_text=:rich_text where topic_id=:topic_id and user_id=:user_id",
        { rich_text, topic_id, user_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// Mark topic as resolved
router.patch(
  "/mark_resolved/topic/:topic_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let topic_id = req.params.topic_id;
      let user_id = req.body.user_data.user_id;

      await Thoth_DB.update_data(
        "update topic set topic_resolved=1 where topic_id=:topic_id and user_id=:user_id",
        {
          topic_id,
          user_id,
        },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// Delete a topic
router.delete(
  "/topic/:topic_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let topic_id = req.params.topic_id;
      let user_id = req.body.user_data.user_id;

      if (!(await OwnerShipChecker.check("topic", topic_id, user_id))) {
        return res.sendStatus(401);
      }
      await delete_topic_image_from_server(topic_id);
      await Thoth_DB.delete_data(
        "delete from topic where topic_id=:topic_id and user_id=:user_id",
        { topic_id, user_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function delete_topic_image_from_server(topic_id) {
  let topics = await Thoth_DB.get_data(
    "select topic_image from topic where topic_id=:topic_id",
    { topic_id },
  );
  if (topics.length == 0) return;
  if (topics[0].topic_image.length == 0) return;
  HelperFile.delete_file_from_server(topics[0].topic_image);
}

// get rooms topic`
router.get(
  "/topic/room/:room_id/:offset",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let room_id = req.params.room_id;
      let offset = parseInt(req.params.offset);
      let limit = 10;

      let topics = await Thoth_DB.get_data(
        "select user_fullname,user_school,user_avatar,user.user_id,topic.* from topic,user where topic.user_id = user.user_id and topic.room_id =:room_id order by topic_id DESC limit :limit offset :offset ",
        { room_id, offset, limit },
      );

      for (const topic_item of topics) {
        let index = topics.indexOf(topic_item);
        topics[index].total_messages = await count_topic_messages(
          topic_item.chat_id,
        );
        if (topics[index].topic_image.trim().length > 0) {
          topics[index].topic_image =
            `${Consts.stream_url}${topics[index].topic_image}`;
        }
        topics[index].user_avatar =
          `${Consts.stream_url}${topics[index].user_avatar}`;
      }

      res.send(topics);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// Search topic
router.get(
  "/search_topic/room/:room_id/token/:token",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let room_id = req.params.room_id;
      let token = req.params.token;

      let topics = await Thoth_DB.get_data(
        `select user_fullname,user_school,user_avatar,user.user_id,topic.* from topic,user where topic.user_id = user.user_id and rich_text like '%${token}%' and topic.room_id = ${room_id} order by topic_id `,
        {},
      );

      for (const topic_item of topics) {
        let index = topics.indexOf(topic_item);
        topics[index].total_messages = await count_topic_messages(
          topic_item.chat_id,
        );
      }

      res.send(topics);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function count_topic_messages(chat_id) {
  let res = await Thoth_DB.get_data(
    "select count(*) as total from comment where chat_id=:chat_id",
    { chat_id },
  );
  return res[0].total;
}

// Count topics on a room
router.get("/count_topics/room/:room_id", async (req, res) => {
  try {
    let room_id = req.params.room_id;
    let total = await Thoth_DB.get_data(
      "select count(*) as total from topic where room_id=:room_id",
      { room_id },
    );
    res.send({ total: parseInt(total[0].total) });
  } catch (error) {
    serverError(error, res);
  }
});

module.exports = router;

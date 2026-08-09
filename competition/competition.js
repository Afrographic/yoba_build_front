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
const { Model_Helper } = require("../../utils/model_helper.js");
const { Drive_Service } = require("../../services/drive/drive.js");

router.post("/competition", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let competition_created_date = new Date();
    let { competition_name, competition_level, room_id } = req.body;
    if (room_id == undefined) {
      room_id = 0;
    }
    let fields_ok = Validator.validateFields(
      { competition_name, competition_level },
      res,
    );
    if (!fields_ok) {
      res.sendStatus(400);
      return;
    }

    competition_name = HelperFunction.Ucase(competition_name);
    competition_level = HelperFunction.Ucase(competition_level);

    let competition = await Thoth_DB.post_data(
      "insert into competition(room_id,competition_name,competition_level,competition_created_date,user_id) values(:room_id,:competition_name,:competition_level,:competition_created_date,:user_id)",
      {
        room_id,
        competition_name,
        competition_level,
        competition_created_date,
        user_id,
      },
    );

    res.send({ competition_id: competition[0] });
  } catch (error) {
    serverError(error, res);
  }
});

// get competitions of a user
router.get(
  "/competition/user/:user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.params.user_id;
      let competitions = await Thoth_DB.get_data(
        "select user_fullname,user_avatar,country_name,competition.* from competition,user,country where competition.user_id=:user_id and over_l= 0 and launched = 0  and user.user_id = competition.user_id and user.country_id = country.country_id and (room_id is null or room_id = 0 ) order by competition_id DESC",
        { user_id },
      );

      // get competitions subjects
      for (const competition of competitions) {
        let index = competitions.indexOf(competition);
        competitions[index].subjects =
          await Model_Helper.get_competition_subject(
            competition.competition_id,
          );
        competitions[index].user_avatar =
          `${Consts.stream_url}${competitions[index].user_avatar}`;
        if (competitions[index].competition_image.trim().length > 0) {
          competitions[index].competition_image =
            `${Consts.stream_url}${competitions[index].competition_image}`;
        }
      }


      res.send(competitions);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get room competitions
router.get(
  "/competition/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let room_id = parseInt(req.params.room_id);
      let competitions = await Thoth_DB.get_data(
        "select * from competition where  over_l= 0 and launched = 0   and room_id =:room_id order by competition_id DESC",
        { room_id },
      );

      let rooms = await Thoth_DB.get_data(
        "select * from room where room_id=:room_id",
        { room_id },
      );
      if (rooms.length == 0) res.status(404).send("Cette salle n'existe pas!");

      // get competitions subjects
      for (const competition of competitions) {
        let index = competitions.indexOf(competition);
        competitions[index].subjects =
          await Model_Helper.get_competition_subject(
            competition.competition_id,
          );
        competitions[index].user_avatar =
          `${Consts.stream_url}${rooms[0].room_avatar}`;
        competitions[index].user_fullname = rooms[0].room_name;
        competitions[index].country_name = `Bamileke`;
        if (competitions[index].competition_image.trim().length > 0) {
          competitions[index].competition_image =
            `${Consts.stream_url}${competitions[index].competition_image}`;
        }
      }


      res.send(competitions);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get single competition item
router.get(
  "/competition/:competititon_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let competititon_id = req.params.competititon_id;
      let competitions = await Thoth_DB.get_data(
        "select user_fullname,user_avatar,country_name,competition.* from competition,user,country where competition.competition_id=:competititon_id and user.user_id = competition.user_id and user.country_id = country.country_id order by competition_id DESC",
        { competititon_id },
      );

      if (competitions.length == 0) {
        return res.send({});
      }
      let competition_item = competitions[0];
      competition_item.subjects =
        await Model_Helper.get_competition_subject(competititon_id);

      res.send(competition_item);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// edit competition name
router.patch(
  "/competition_name/:competition_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let competition_id = req.params.competition_id;
      let user_id = req.body.user_data.user_id;
      let competition_name = req.body.competition_name ?? "";
      if (competition_name.trim().length == 0) {
        return res.sendStatus(400);
      }

      competition_name = HelperFunction.Ucase(competition_name);

      let data = await Thoth_DB.update_data(
        "update competition set competition_name=:competition_name where competition_id=:competition_id and user_id=:user_id",
        { competition_name, competition_id, user_id },
      );

      if (data[0].affectedRows == 0) {
        return res.sendStatus(401);
      }

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// edit competition name
router.patch(
  "/competition_level/:competition_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let competition_id = req.params.competition_id;
      let user_id = req.body.user_data.user_id;
      let competition_level = req.body.competition_level ?? "";
      if (competition_level.trim().length == 0) {
        return res.sendStatus(400);
      }

      competition_level = HelperFunction.Ucase(competition_level);
      let data = await Thoth_DB.update_data(
        "update competition set competition_level=:competition_level where competition_id=:competition_id and user_id=:user_id",
        { competition_level, competition_id, user_id },
      );

      if (data[0].affectedRows == 0) {
        return res.sendStatus(401);
      }
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// delete competition
router.delete(
  "/competition/:competition_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let competition_id = req.params.competition_id;
      let data = await Thoth_DB.delete_data(
        "delete from competition where competition_id=:competition_id and user_id=:user_id",
        { competition_id, user_id },
      );
      if (data[0].affectedRows == 0) {
        return res.sendStatus(401);
      }
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// edit competition image
router.patch(
  "/image_competition/:competition_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let competition_id = req.params.competition_id;
      let user_id = req.body.user_data.user_id;

      if (!Validator.valid_image_upload(req)) {
        res.sendStatus(401);
        return;
      }

      await HelperFunction.delete_db_file(
        "private",
        "competition",
        "competition_image",
        "competition_id",
        competition_id,
      );

      let competition_image = await Drive_Service.upload_file(
        req.files.file.name,
        req.files.file.data,
      );

      await Thoth_DB.update_data(
        "update competition set competition_image=:competition_image where competition_id=:competition_id and user_id=:user_id",
        { competition_image, competition_id, user_id },
      );

      res.send({
        competition_image: `${Consts.stream_url}${competition_image}`,
      });
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

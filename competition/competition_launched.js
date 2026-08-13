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
const { User_Controller } = require("../../controllers/user_controller.js");
const { NotifEngine } = require("../../services/NotifEngine.js");

router.post(
  "/competition_launched",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let owner_user_id = user_id;
      let competition_id = req.body.competition_id ?? 0;

      if (competition_id == 0) {
        res.sendStatus(400);
        return;
      }

      let competitions = await Thoth_DB.get_data(
        "select * from competition where competition_id=:competition_id",
        { competition_id },
      );
      if (competitions.length == 0) return res.sendStatus(404);
      let competition_name = competitions[0].competition_name;
      let room_id = competitions[0].room_id;

      

      let competition_subjects =
        await Model_Helper.get_competition_subject(competition_id);

      if (competition_subjects == 0) {
        res.sendStatus(401);
        return;
      }

      
      let competition_launched_created_date = new Date();
      await Thoth_DB.post_data("insert into competition_launched(competition_launched_created_date,competition_id,user_id,room_id) values(:competition_launched_created_date,:competition_id,:user_id,:room_id)",{competition_launched_created_date,competition_id,user_id,room_id})


      // set competition state as launched
      await Thoth_DB.update_data(
        "update competition set launched = 1 where competition_id = :competition_id",
        { competition_id },
      );


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
            let message = `Cher ${user_data.user_fullname}, Une nouvelle Evaluation a ete lance   dans votre  salle ${room_name} - << ${competition_name} >>`;
            NotifEngine.new(user_id, message);
          }
        }
      }

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function end_competition(
  competition_id,
  subjects,
  competition_launched_id,
  user_id,
  token,
) {
  let duration = 0;
  for (const subject of subjects) {
    duration += subject.quiz.quiz_duration;
  }
  // setTimeout(() => {
  //   let date = new Date();

  //   Thoth_DB.update_data(
  //     "update competition set over_l = 1 where competition_id=:competition_id",
  //     { competition_id },
  //   );

  //   Thoth_DB.update_data(
  //     "update competition_launched set competition_launched_end = 1,competition_launched_end_date=:date where competition_launched_id=:competition_launched_id",
  //     { date, competition_launched_id },
  //   );

  //   // Thoth_DB.post_data("insert into competition_done(competition_launched_id,user_id,created_date) values(:competition_launched_id,:user_id,:date)", { competition_launched_id, user_id, date })
  // }, duration * 1000);
}

// count user as competition member
router.post(
  "/competition_member",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let competition_launched_id = req.body.competition_launched_id ?? 0;
      let user_id = req.body.user_data.user_id;
      let created_date = new Date();

      if (competition_launched_id == 0) {
        return res.sendStatus(401);
      }

      let data = await Thoth_DB.get_data(
        "select * from competition_done where competition_launched_id=:competition_launched_id and user_id=:user_id",
        { competition_launched_id, user_id },
      );

      if (data.length > 0) {
        res.sendStatus(200);
        return;
      }

      await Thoth_DB.post_data(
        "insert into competition_done(competition_launched_id,user_id,created_date) values(:competition_launched_id,:user_id,:created_date)",
        { competition_launched_id, user_id, created_date },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get competition total duration
router.get(
  "/competition_duration/:competition_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let competition_id = req.params.competition_id;
      let competition_subjects =
        await Model_Helper.get_competition_subject(competition_id);

      if (competition_subjects == 0) {
        res.send({ duration: 0 });
        return;
      }

      let duration = 0;
      for (const item of competition_subjects) {
        let quiz = await Model_Helper.get_quiz_item(item.quiz_id);
        duration += quiz.quiz_duration;
      }

      res.send({ duration: duration });
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get competitions launched by a user
router.get(
  "/launched_comp_user",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let competitions_launcheds = await Thoth_DB.get_data(
        "select * from competition_launched where competition_launched.user_id=:user_id and competition_launched_end=0 order by competition_launched_id DESC",
        { user_id },
      );
      for (const comp_launch of competitions_launcheds) {
        let index = competitions_launcheds.indexOf(comp_launch);
        competitions_launcheds[index].competition_launched_end_date =
          competitions_launcheds[index].competition_launched_end_date ?? "";
        competitions_launcheds[index].competition =
          await Model_Helper.get_competition_item(comp_launch.competition_id);
      }
      res.send(competitions_launcheds);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get competitions launched on a room
router.get(
  "/launched_comp/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let room_id = parseInt(req.params.room_id);
      let competitions_launcheds = await Thoth_DB.get_data(
        "select * from competition_launched where room_id=:room_id and competition_launched_end=0 order by competition_launched_id DESC",
        { room_id },
      );

      for (const comp_launch of competitions_launcheds) {
        let index = competitions_launcheds.indexOf(comp_launch);
        competitions_launcheds[index].competition_launched_end_date =
          competitions_launcheds[index].competition_launched_end_date ?? "";
        competitions_launcheds[index].competition =
          await Model_Helper.get_competition_item_room(
            comp_launch.competition_id,
          );
      }

      res.send(competitions_launcheds);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get competitions launched by a user
router.get(
  "/launched_comp_thoth",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;

      let competitions_launcheds = await Thoth_DB.get_data(
        "select * from competition_launched where  competition_launched_end=0 order by competition_launched_id ASC ",
        { user_id },
      );
      for (const comp_launch of competitions_launcheds) {
        let index = competitions_launcheds.indexOf(comp_launch);
        competitions_launcheds[index].competition_launched_end_date =
          competitions_launcheds[index].competition_launched_end_date ?? "";

        competitions_launcheds[index].competition =
          await Model_Helper.get_competition_item(comp_launch.competition_id);
      }

      res.send(competitions_launcheds);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get total competitions launched on Thoth
router.get(
  "/total_competition_launched",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let response = await Thoth_DB.get_data(
        "select count(*) as total from competition_launched where competition_launched_end=0",
      );
      res.send({ total: response[0].total });
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get total competitions launched on Thoth
router.get(
  "/total_competition_over",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let response = await Thoth_DB.get_data(
        "select count(*) as total from competition_launched where competition_launched_end=1",
      );
      res.send({ total: response[0].total });
    } catch (error) {
      serverError(error, res);
    }
  },
);

// check if competition already launched
router.get(
  "/already_go/:competition_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let competition_id = req.params.competition_id;
      let competitions = await Thoth_DB.get_data(
        "select * from competition_launched where competition_id=:competition_id",
        { competition_id },
      );
      res.send({ launched: competitions.length > 0 });
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get teacher end competition
router.get(
  "/end_competition/offset/:offset",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let offset = parseInt(req.params.offset);
      let limit = 10;
      let user_id = req.body.user_data.user_id;
      let competitions_ends = await Thoth_DB.get_data(
        "select * from competition_launched where competition_launched.user_id=:user_id and competition_launched_end=1 order by competition_launched_id DESC limit :limit offset :offset",
        { user_id, limit, offset },
      );
      for (const comp_launch of competitions_ends) {
        let index = competitions_ends.indexOf(comp_launch);
        competitions_ends[index].competition_launched_end_date =
          competitions_ends[index].competition_launched_end_date;
        competitions_ends[index].competition =
          await Model_Helper.get_competition_item(comp_launch.competition_id);
      }
      res.send(competitions_ends);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get room competitions
router.get(
  "/end_competition/room/:room_id/offset/:offset",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let offset = parseInt(req.params.offset);
      let limit = 30;
      let room_id = parseInt(req.params.room_id);
      let competitions_ends = await Thoth_DB.get_data(
        "select * from competition_launched where room_id = :room_id and competition_launched_end=1 order by competition_launched_id DESC limit :limit offset :offset",
        { room_id, limit, offset },
      );
      for (const comp_launch of competitions_ends) {
        let index = competitions_ends.indexOf(comp_launch);
        competitions_ends[index].competition_launched_end_date =
          competitions_ends[index].competition_launched_end_date;
        competitions_ends[index].competition =
          await Model_Helper.get_competition_item_room(
            comp_launch.competition_id,
          );
      }
      res.send(competitions_ends);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get user end competition
router.get(
  "/user_end_competition/offset/:offset",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let offset = parseInt(req.params.offset);
      let user_id = req.body.user_data.user_id;
      let limit = 10;
      let competition_over_ids = await Thoth_DB.get_data(
        "select * from competition_done where user_id=:user_id  limit :limit offset :offset",
        { user_id, offset, limit },
      );
      let competitions_ends = [];
      for (const id of competition_over_ids) {
        let competitions_launcheds = await Thoth_DB.get_data(
          `select * from competition_launched where competition_launched_id=${id.competition_launched_id}`,
          {},
        );
        competitions_ends.push(competitions_launcheds[0]);
      }

      for (const comp_launch of competitions_ends) {
        let index = competitions_ends.indexOf(comp_launch);
        competitions_ends[index].competition_launched_end_date =
          competitions_ends[index].competition_launched_end_date;
        competitions_ends[index].competition =
          await Model_Helper.get_competition_item(comp_launch.competition_id);
      }

      res.send(competitions_ends);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get total competition done by a user
router.get(
  "/total_user_end_competition",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let response = await Thoth_DB.get_data(
        "select count(*) as total from competition_done where user_id=:user_id",
        { user_id },
      );
      res.send({ total: response[0].total });
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

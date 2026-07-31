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

router.post("/flashcard", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let flashcard_created_date = new Date();
    let flashcard_description = req.body.flashcard_description ?? "";
    let { subject_id, level_id, chapter_id, room_id } = req.body;

    flashcard_description = HelperFunction.Ucase(flashcard_description);

    let flashcard = await Thoth_DB.post_data(
      "insert into flashcard(room_id,flashcard_description,flashcard_created_date,level_id,subject_id,chapter_id,user_id) values(:room_id,:flashcard_description,:flashcard_created_date,:level_id,:subject_id,:chapter_id,:user_id)",
      {
        room_id,
        flashcard_description,
        flashcard_created_date,
        level_id,
        subject_id,
        chapter_id,
        user_id,
      },
    );

    let flashcard_id = flashcard[0];

    res.send({ flashcard_id });
  } catch (error) {
    serverError(error, res);
  }
});

// get single flashcard
router.get(
  "/flashcard/:flashcard_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let flashcard_id = JSON.parse(req.params.flashcard_id);
      let user_id = req.body.user_data.user_id;

      let flashcards = await Thoth_DB.get_data(
        `SELECT flashcard.*,
                                                 user_fullname,
                                                 user_avatar,
                                                 user_school,
                                                   level_name,
                                                 chapter_name,
                                                 subject_name,
                                                 chapter_name
                                          FROM flashcard,user,subject,level,chapter
                                         where flashcard.flashcard_id=:flashcard_id and  user.user_id=flashcard.user_id  and flashcard.level_id = level.level_id and flashcard.subject_id=subject.subject_id and flashcard.chapter_id = chapter.chapter_id`,
        { flashcard_id },
      );

      if (flashcards.length > 0) {
        let total_question =
          await Model_Helper.count_flashcard_question(flashcard_id);

        flashcards[0].total_question = total_question.total;
        flashcards[0].user_avatar = `${Consts.stream_url}${flashcards[0].user_avatar}`;
        flashcards[0].done_date = await Model_Helper.get_done_date(
          flashcard_id,
          user_id,
        );
        flashcards[0].is_favorite = await Model_Helper.is_favorite(
          flashcard_id,
          user_id,
        );
        res.send(flashcards[0]);
      } else {
        res.send({});
      }
    } catch (error) {
      serverError(error, res);
    }
  },
);

// count the questions of a flashcard
router.get(
  "/count_questions/flashcard/:flashcard_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let flashcard_id = JSON.parse(req.params.flashcard_id);
      let total = await Thoth_DB.get_data(
        "select count(*) as total from flashcard_question where flashcard_id = :flashcard_id",
        { flashcard_id },
      );

      res.send({
        total: parseInt(total[0].total),
      });
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get chapter flashcard
router.get(
  "/chaper_flashcard/chapter/:chaper_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let chapter_id = req.params.chaper_id;
      let flashcards_ids = await Thoth_DB.get_data(
        "select flashcard_id from flashcard where chapter_id=:chapter_id",
        { chapter_id },
      );
      let flashcards = [];
      for (const flashcard of flashcards_ids) {
        let data = await Model_Helper.get_flashcard_item(
          flashcard.flashcard_id,
          req.body.user_data.user_id,
        );
        flashcards.push(data);
      }
      res.send(flashcards);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//get flashcard room generale
router.get(
  "/flashcard-generale/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let room_id = parseInt(req.params.room_id);
      let data = await Thoth_DB.get_data(
        "select * from flashcard where level_id=0 and subject_id=0 and chapter_id=0 and room_id=:room_id order by flashcard_id DESC",
        { room_id },
      );
      let flashcards = [];
      for (const flashcard of data) {
        let data = await Model_Helper.get_flashcard_item(
          flashcard.flashcard_id,
          req.body.user_data.user_id,
        );
        flashcards.push(data);
      }
      res.send(flashcards);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get chapter cours
router.get(
  "/chaper_cours/cours/:chaper_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let chapter_id = parseInt(req.params.chaper_id);
      let cours = await Thoth_DB.get_data(
        "select * from cours where chapter_id=:chapter_id",
        { chapter_id },
      );
      for (let i = 0; i <= cours.length - 1; i++) {
        cours[i].cours = JSON.parse(cours[i].cours);
      }
      res.send(cours);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//mark a flashcard as done
router.post("/done_flashcard", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let flashcard_id = req.body.flashcard_id ?? 0;
    let done_date = new Date();

    if (flashcard_id == 0) {
      return res.sendStatus(400);
    }

    await Thoth_DB.post_data(
      "insert into flashcard_done(flashcard_id,user_id,done_date) values (:flashcard_id,:user_id,:done_date)",
      {
        flashcard_id,
        user_id,
        done_date,
      },
    );

    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

router.get(
  "/question/flashcard/:flashcard_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let flashcard_id = JSON.parse(req.params.flashcard_id);
      let questions = await Thoth_DB.get_data(
        "select * from flashcard_question where flashcard_id=:flashcard_id",
        { flashcard_id },
      );
      res.send(questions);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get(
  "/home/flashCard/offset/:offset",
  Security.authenticateToken,
  async (req, res) => {
    try {
      // Will customise this later
      let user_id = req.body.user_data.user_id;
      let offset = JSON.parse(req.params.offset);
      let limit = 10;

      let flashcards = await Thoth_DB.get_data(
        `SELECT flashcard_id.*,
                                                 user_fullname,
                                                 user_avatar,
                                                 user_school,
                                                 level_name,
                                                 chapter_name,
                                                 subject_name
                                          FROM exercice,user,subject,level,chapter
                                         where flashcard_id.level_id = level.level_id and flashcard_id.chapter_id=chapter.chapter_id
                                         order by flashcard_id DESC limit :limit offset :offset`,
        { limit, offset },
      );

      res.send(flashcards);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get(
  "/search_flashCard/:token",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let token = req.params.token.trim();
      let flashcard_ids = await Thoth_DB.get_data(
        `select flashcard_id from flashcard where flashcard_title LIKE '%${token}%'`,
      );

      let flashcards = [];
      for (const flascard_id of flashcard_ids) {
        let response = await Model_Helper.get_flashcard_item(flascard_id);
        flashcards.push(response.data);
      }

      res.send(flashcards);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get("/total_flashcard", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let total = await Thoth_DB.get_data(
      "select count(*) as total from flashcard where user_id=:user_id",
      { user_id },
    );

    res.send({ total: parseInt(total[0].total) });
  } catch (error) {
    serverError(error, res);
  }
});

router.delete(
  "/flashcard/:flashcard_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let flashcard_id = JSON.parse(req.params.flashcard_id);
      let user_id = req.body.user_data.user_id;

      if (!OwnerShipChecker.check("flashcard", flashcard_id, user_id)) {
        res.sendStatus(401);
        return;
      }

      await Thoth_DB.delete_data(
        "delete from flashcard where flashcard_id=:flascard_id",
        { flashcard_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

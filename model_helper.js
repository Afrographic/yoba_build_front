const { Consts } = require("../consts");
const { Quiz_Question_controller } = require("../controllers/quiz_question");
const { Thoth_DB } = require("../thoth_db");
const { HelperFile } = require("./helper_file");
const { HelperFunction } = require("./helper_function");

class Model_Helper {
  static async delete_comment_file(comment_file_id) {
    await HelperFunction.delete_db_file(
      "private",
      "comment_file",
      "comment_file_url",
      "comment_file_id",
      comment_file_id,
    );

    await Thoth_DB.delete_data(
      "delete from comment_file where comment_file_id=:comment_file_id and user_id=:user_id",
      { comment_file_id, user_id },
    );
  }

  static async delete_comment_voice(comment_voice_id) {
    await HelperFunction.delete_db_file(
      "private",
      "comment_voice",
      "comment_voice_url",
      "comment_voice_id",
      comment_voice_id,
    );

    await Thoth_DB.delete_data(
      "delete from comment_voice where comment_voice_id=:comment_voice_id and user_id=:user_id",
      { comment_voice_id, user_id },
    );
  }

  static async delete_comment_image(comment_image_id, user_id) {
    await HelperFunction.delete_db_file(
      "private",
      "comment_image",
      "comment_image_url",
      "comment_image_id",
      comment_image_id,
    );
    await HelperFunction.delete_db_file(
      "private/thumbnails",
      "comment_image",
      "comment_image_url",
      "comment_image_id",
      comment_image_id,
    );

    await Thoth_DB.delete_data(
      "delete from comment_image where comment_image_id=:comment_image_id and user_id=:user_id",
      { comment_image_id, user_id },
    );
  }

  static async get_user_data_by_id(user_id, requester_user_id) {
    let user_data = await Thoth_DB.get_data(
      "SELECT user.country_id,country_name,country_flag,user_account_activated,user_email,user_school,user_id,user_fullname,user_avatar,user_bio,user_created_date FROM user,country WHERE user_id=:user_id and user.country_id=country.country_id",
      { user_id },
    );

    let follow = await this.check_if_user_following(requester_user_id, user_id);

    if (user_data[0].user_avatar) {
      user_data[0].user_avatar = `${Consts.stream_url}${user_data[0].user_avatar}`;
    }

    user_data[0].is_following = follow.is_following;

    return user_data[0];
  }

  static async delete_lib_context(lib_context_id) {
    await this.#delete_lib_context_sub_context(
      room_id,
      lib_context_id,
      req.body.token,
    );
    await this.#delete_lib_files(lib_context_id);
    await Thoth_DB.delete_data(
      "delete  from lib_context where lib_context_id =:lib_context_id",
      { lib_context_id },
    );
  }

  static async #delete_lib_files(lib_context_id) {
    let files = await Thoth_DB.get_data(
      "select lib_file_url from lib where lib_context_id = :lib_context_id",
      { lib_context_id },
    );
    for (const file of files) {
      HelperFile.delete_file_from_server(file.lib_file_url);
    }
  }

  static async #delete_lib_context_sub_context(lib_context_id) {
    let lib_contexts = await Thoth_DB.get_data(
      "select lib_context_id from lib_context where lib_context_parent_id = :lib_context_id",
      { lib_context_id },
    );
    for (const lib_context of lib_contexts) {
      await this.delete_lib_context(lib_context.lib_context_id);
    }
  }

  static async get_children_of_subcontext(lib_context_id) {
    let contexts = [];

    async function get_sub_contexts(lib_context_id) {
      let child_contexts = await Model_Helper.get_sub_context_2(lib_context_id);

      for (const lib_context_item of child_contexts) {
        await get_sub_contexts(lib_context_item.lib_context_id);
      }
      if (child_contexts.length > 0) {
        contexts = contexts.concat(child_contexts);
      }
    }
    await get_sub_contexts(lib_context_id);

    return contexts;
  }

  static async get_sub_context_2(lib_context_id) {
    let sub_folders = await Thoth_DB.get_data(
      "select * from lib_context where lib_context_parent_id=:lib_context_id ",
      { lib_context_id },
    );

    return sub_folders;
  }

  static async get_country_data(country_id) {
    let countries = await Thoth_DB.get_data(
      "select country_name from country where country_id=:country_id",
      { country_id },
    );
    if (countries.length == 0) return "Undefined";
    return countries[0].country_name;
  }

  static async get_room_data(room_id, user_id) {
    let rooms = await Thoth_DB.get_data(
      "select user_fullname as tutor,room.* from room,user where room_id=:room_id and room.user_id = user.user_id",
      { room_id },
    );
    if (rooms.length == 0) {
      return res.send({});
    }
    rooms[0].total_student = await this.get_total_students(room_id);
    rooms[0].total_home_work = 0;
    rooms[0].is_admin = await this.is_room_admin(room_id, user_id);
    rooms[0].room_avatar = `${Consts.stream_url}${rooms[0].room_avatar}`;
    return rooms[0];
  }

  static async get_total_students(room_id) {
    let res = await Thoth_DB.get_data(
      "select count(room_id) as total from user_room where room_id=:room_id ",
      { room_id },
    );
    return res[0].total;
  }

  static async is_room_admin(room_id, user_id) {
    let users = await Thoth_DB.get_data(
      "select * from room_admin where user_id=:user_id and room_id=:room_id",
      { user_id, room_id },
    );
    return users.length > 0;
  }

  static async check_if_user_exist_by_email(user_email) {
    user_email = user_email.trim();
    let reply = await Thoth_DB.get_data(
      "SELECT * FROM user WHERE user_email =:user_email",
      { user_email },
    );
    let res = {
      already_taken: reply.length > 0,
    };
    return res;
  }

  static async check_if_user_following(user_id, follow_user_id) {
    let result = await Thoth_DB.get_data(
      "select * from follow where user_id=:user_id and follow_user_id=:follow_user_id",
      {
        user_id,
        follow_user_id,
      },
    );

    return { is_following: result.length > 0 };
  }

  static async get_competition_subject(competition_id) {
    let competition_subjects = await Thoth_DB.get_data(
      "select * from competition_subject where competition_id=:competition_id",
      { competition_id },
    );
    //  get total questions
    for (const competition_subject of competition_subjects) {
      let index = competition_subjects.indexOf(competition_subject);
      // get total questions
      let axios_res = await this.get_total_question(
        competition_subject.quiz_id,
      );
      console.log(`From API ${axios_res.total}`);
      competition_subjects[index].total_question = axios_res.total;
      // get quiz object
      axios_res = await this.get_subjects_quiz(competition_subject.quiz_id);
      competition_subjects[index].quiz = axios_res;
    }
    return competition_subjects;
  }

  static async get_competition_item(competition_id) {
    let competitions = await Thoth_DB.get_data(
      "select user_fullname,user_avatar,country_name,competition.* from competition,user,country where competition.competition_id=:competition_id and user.user_id = competition.user_id and user.country_id = country.country_id order by competition_id DESC",
      { competition_id },
    );

    if (competitions.length == 0) {
      return {};
    }
    let competition_item = competitions[0];
    competition_item.subjects =
      await this.get_competition_subject(competition_id);
    competition_item.user_avatar = `${Consts.stream_url}${competition_item.user_avatar}`;

    if (competition_item.competition_image.trim().length > 0) {
      competition_item.competition_image = `${Consts.stream_url}${competition_item.competition_image}`;
    }

    return competition_item;
  }

  static async get_total_question(quiz_id) {
    let total = await Thoth_DB.get_data(
      "select count(*) as total from question where quiz_id=:quiz_id",
      { quiz_id },
    );

    if (total.length == 0) {
      return { total: 0 };
    }

    return { total: parseInt(total[0].total) };
  }

  static async get_subjects_quiz(quiz_id) {
    let quiz = await Thoth_DB.get_data(
      `SELECT quiz.*,
                                                 user_fullname,
                                                 user_avatar,
                                                 user_school
                                                
                                          FROM quiz,user
                                         where quiz_id=:quiz_id and user.user_id = quiz.user_id`,
      { quiz_id },
    );

    if (quiz.length == 0) {
      return {};
    }

    let quiz_item = quiz[0];
    // get total question
    quiz_item.elapsed_time = HelperFunction.get_elapsed_time(
      quiz_item.quiz_created_date,
    );
    let axios_res = await this.get_total_question(quiz_item.quiz_id);

    quiz_item.total_question = axios_res.total;
    quiz_item.level_id = 0;
    quiz_item.subject_id = 0;
    quiz_item.chapter_id = 0;
    quiz_item.level_name = "";
    quiz_item.subject_name = "";
    quiz_item.chapter_name = "";
    quiz_item.questions = await Quiz_Question_controller.get_questions(
      quiz_item.quiz_id,
    );
    return quiz_item;
  }

  static async get_quiz_item(quiz_id) {
    let quiz = await Thoth_DB.get_data(
      `SELECT quiz.*,
                                                 user_fullname,
                                                 user_avatar,
                                                 user_school
                                                
                                          FROM quiz,user
                                         where quiz_id=:quiz_id  and user.user_id = quiz.user_id`,
      { quiz_id },
    );

    if (quiz.length == 0) {
      return {};
    }
    let quiz_item = quiz[0];

    // get total question
    quiz_item.elapsed_time = HelperFunction.get_elapsed_time(
      quiz_item.quiz_created_date,
    );
    let axios_res = await Model_Helper.get_total_question(quiz_item.quiz_id);
    quiz_item.total_question = axios_res.total;
    quiz_item.user_avatar = `${Consts.stream_url}${quiz_item.user_avatar}`;
    if (quiz_item.quiz_image.trim().length > 0) {
      quiz_item.quiz_image = `${Consts.stream_url}${quiz_item.quiz_image}`;
    }

    // get quiz questions
    quiz_item.questions = await Quiz_Question_controller.get_questions(quiz_id);
    return quiz_item;
  }

  static async get_flashcard_item(flashcard_id, user_id) {
    let flashcards = await Thoth_DB.get_data(
      `SELECT flashcard.*,
                                                 user_fullname,
                                                 user_avatar,
                                                 user_school
                                          FROM flashcard,user
                                         where flashcard.flashcard_id=:flashcard_id and  user.user_id=flashcard.user_id `,
      { flashcard_id },
    );

    if (flashcards.length > 0) {
      let total_question = await this.count_flashcard_question(flashcard_id);
      flashcards[0].total_question = total_question.total;
      flashcards[0].done_date = await this.get_done_date(flashcard_id, user_id);
      flashcards[0].is_favorite = await this.is_favorite(flashcard_id, user_id);
      flashcards[0].user_avatar = `${Consts.stream_url}${flashcards[0].user_avatar}`;
      return flashcards[0];
    } else {
      return {};
    }
  }

  static async get_done_date(flashcard_id, user_id) {
    let res = await Thoth_DB.get_data(
      "select * from flashcard_done where flashcard_id=:flashcard_id and user_id=:user_id",
      { flashcard_id, user_id },
    );
    if (res.length > 0) return res[0].done_date;
    return "";
  }

  static async is_favorite(flashcard_id, user_id) {
    let res = await Thoth_DB.get_data(
      "select * from flashcard_favoris where flashcard_id=:flashcard_id and user_id=:user_id",
      { flashcard_id, user_id },
    );
    if (res.length > 0) return 1;
    return 0;
  }

  static async count_flashcard_question(flashcard_id) {
    let total = await Thoth_DB.get_data(
      "select count(*) as total from flashcard_question where flashcard_id = :flashcard_id",
      { flashcard_id },
    );

    return {
      total: parseInt(total[0].total),
    };
  }
}

module.exports.Model_Helper = Model_Helper;

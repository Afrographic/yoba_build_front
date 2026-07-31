const { Thoth_DB } = require("../thoth_db");


class OwnerShipChecker {
    static async check(table_name, field_id, user_id) {
        let res = await Thoth_DB.get_data(`SELECT * FROM ${table_name} WHERE  ${table_name}_id = :field_id AND user_id=:user_id `, { field_id, user_id });
        return res.length > 0;
    }

    static async password_belong_to_user(user_password, user_id) {
        user_password = Security.encryptPassword(user_password);
        let data = await Thoth_DB.get_data("SELECT user_id FROM user WHERE user_id=:user_id AND user_password=:user_password", { user_id, user_password });
        return data.length > 0;
    }

    static async avatar_belong_to_user(user_id, user_avatar) {
        let res = await Thoth_DB.get_data("SELECT * FROM user WHERE user_id=:user_id AND user_avatar=:user_avatar", { user_id, user_avatar });
        return res.length > 0;
    }

    static async user_belong_to_room(room_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM user_room WHERE user_id=:user_id AND room_id=:room_id", { user_id, room_id });
        return res.length > 0;
    }

    static async is_topic_owner(topic_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM topic WHERE user_id=:user_id AND topic_id=:topic_id", { user_id, topic_id });
        return res.length > 0;
    }
    static async is_question_owner(question_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM question WHERE user_id=:user_id AND question_id=:question_id", { user_id, question_id });
        return res.length > 0;
    }

    static async is_comment_pinned_owner(comment_pinned_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM comment_pinned WHERE user_id=:user_id AND comment_pinned_id=:comment_pinned_id", { user_id, comment_pinned_id });
        return res.length > 0;
    }

    static async is_comment_voice_owner(comment_voice_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM comment_voice WHERE user_id=:user_id AND comment_voice_id=:comment_voice_id", { user_id, comment_voice_id });
        return res.length > 0;
    }

    static async is_comment_file_owner(comment_file_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM comment_file WHERE user_id=:user_id AND comment_file_id=:comment_file_id", { user_id, comment_file_id });
        return res.length > 0;
    }

    static async is_home_work_student_owner(home_work_student_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM home_work_student WHERE user_id=:user_id AND home_work_student_id=:home_work_student_id", { user_id, home_work_student_id });
        return res.length > 0;
    }

    static async is_chapter_owner(chapter_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM chapter WHERE user_id=:user_id AND chapter_id=:chapter_id", { user_id, chapter_id });
        return res.length > 0;
    }

    static async is_lib_owner(lib_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM lib WHERE user_id=:user_id AND lib_id=:lib_id", { user_id, lib_id });
        return res.length > 0;
    }

    static async is_new_file_owner(new_file_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM new_file WHERE user_id=:user_id AND new_file_id=:new_file_id", { user_id, new_file_id });
        return res.length > 0;
    }
    static async is_new_owner(new_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM new WHERE user_id=:user_id AND new_id=:new_id", { user_id, new_id });
        return res.length > 0;
    }
    static async is_room_owner(room_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM room WHERE user_id=:user_id AND room_id=:room_id", { user_id, room_id });
        return res.length > 0;
    }

    static async is_room_admin(room_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM room_admin WHERE user_id=:user_id AND room_id=:room_id", { user_id, room_id });
        return res.length > 0;
    }

    static async is_quiz_owner(quiz_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM quiz WHERE user_id=:user_id AND quiz_id=:quiz_id", { user_id, quiz_id });
        return res.length > 0;
    }

    static async is_test_owner(test_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM test WHERE user_id=:user_id AND test_id=:test_id", { user_id, test_id });
        return res.length > 0;
    }
    static async is_level_owner(level_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM level WHERE user_id=:user_id AND level_id=:level_id", { user_id, level_id });
        return res.length > 0;
    }
    static async is_subject_owner(subject_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM subject WHERE user_id=:user_id AND subject_id=:subject_id", { user_id, subject_id });
        return res.length > 0;
    }

    static async is_room_member(room_id, user_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM user_room WHERE user_id=:user_id AND room_id=:room_id", { user_id, room_id });
        return res.length > 0;
    }

    static async is_room_home_work(room_id, home_work_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM home_work WHERE home_work_id=:home_work_id AND room_id=:room_id", { room_id, home_work_id });
        return res.length > 0;
    }

    static async is_room_home_work_student(room_id, home_work_student_id) {
        let res = await Thoth_DB.get_data("SELECT * FROM home_work_student WHERE home_work_student_id=:home_work_student_id AND room_id=:room_id", { room_id, home_work_student_id });
        return res.length > 0;
    }
}

module.exports.OwnerShipChecker = OwnerShipChecker;
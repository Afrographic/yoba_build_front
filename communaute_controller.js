const { DB } = require("../db");
const { Chat_Controller } = require("./chat_controller");
const { User_Controller } = require("./user_controller");

class CommuanuteController {
  static async owns(user_id, communaute_id) {
    let communautes = await DB.get_data(
      "select * from communaute where user_id=:user_id and communaute_id=:communaute_id",
      { user_id, communaute_id },
    );
    return communautes.length > 0;
  }

  static async get_communaute_item(communaute_id, user_id) {
    let communautes = await DB.get_data(
      "select * from communaute where communaute_id=:communaute_id",
      { communaute_id },
    );
    let item = communautes[0];
    //get latest message
    let chat_id = item.chat_id;

    item.recent_message = await Chat_Controller.get_recent_message(chat_id);
    item.total_unread = await Chat_Controller.count_total_unread(
      chat_id,
      user_id,
    );

    item.total_members = await this.get_total_members(communaute_id);
    return item;
  }

  static async get_total_members(communaute_id) {
    let res = await DB.get_data(
      "select count(*) as total from communaute_user where communaute_id =:communaute_id",
      { communaute_id },
    );
    return res[0].total;
  }

  static async getMembers(communaute_id) {
    let usersIds = await DB.get_data(
      "select * from communaute_user where communaute_id =:communaute_id",
      { communaute_id },
    );
    let users = [];
    for (const item of usersIds) {
      let userInfo = await this.get_basic_info(item.user_id);
      users.push(userInfo);
    }
    return users;
  }

  static async get_basic_info(user_id) {
    let user_data = await DB.get_data(
      "select user_id,user_full_name,user_avatar,user_created_date from user where user_id=:user_id",
      { user_id },
    );
    return user_data[0];
  }

  static async getUserCommunity(user_id) {
    let communautes_user = await DB.get_data(
      "select * from communaute_user where user_id=:user_id",
      { user_id },
    );

    let communautes = [];
    for (const item of communautes_user) {
      let communaute_item = await CommuanuteController.get_communaute_item(
        item.communaute_id,
        user_id,
      );
      communautes.push(communaute_item);
    }
    return communautes;
  }
}

module.exports.CommuanuteController = CommuanuteController;

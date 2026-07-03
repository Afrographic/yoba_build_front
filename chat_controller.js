const { DB } = require("../db");
const { User_Controller } = require("./user_controller");

class Chat_Controller {
  static async get_total_message(chat_id) {
    let total = await DB.get_data(
      "select count(*) as total from chat_message where chat_id=:chat_id",
      { chat_id },
    );
    return total[0].total;
  }
  static async get_images(chat_message_id) {
    let images = await DB.get_data(
      "select * from chat_image where chat_message_id=:chat_message_id",
      { chat_message_id },
    );
    return images;
  }

  static async get_reactions(chat_message_id) {
    let reactions = await DB.get_data(
      "select * from chat_message_reaction where chat_message_id=:chat_message_id",
      { chat_message_id },
    );
    let reactions_grouped_by_image = [];
    //getting unique image id
    for (let i = 0; i <= reactions.length - 1; i++) {
      let index = -1;
      for (let j = 0; j <= reactions_grouped_by_image.length - 1; j++) {
        if (reactions_grouped_by_image[j].image_id == reactions[i].image_id) {
          index = j;
        }
      }
      if (index == -1) {
        reactions_grouped_by_image.push({
          image_id: reactions[i].image_id,
          reactions: [],
        });
      }
    }
    //Add all the reactions to corresponding image id
    for (let i = 0; i <= reactions_grouped_by_image.length - 1; i++) {
      for (let k = 0; k <= reactions.length - 1; k++) {
        if (reactions[k].image_id == reactions_grouped_by_image[i].image_id) {
          reactions_grouped_by_image[i].reactions.push(reactions[k]);
        }
      }
    }
    //Group by image_id;
    return reactions_grouped_by_image;
  }

  static async get_audio_url(chat_message_id) {
    let audios = await DB.get_data(
      "select * from chat_audio where chat_message_id=:chat_message_id",
      { chat_message_id },
    );
    return audios.length > 0 ? audios[0].url : "";
  }
  static async get_file_url(chat_message_id) {
    let files = await DB.get_data(
      "select * from chat_file where chat_message_id=:chat_message_id",
      { chat_message_id },
    );
    return files;
  }

  static async get_recent_message(chat_id) {
    let messages = await DB.get_data(
      "select * from chat_message where chat_id=:chat_id order by chat_message_id DESC limit 1 ",
      { chat_id },
    );
    let latest_message = { is_read :1,message: "Aucun message..." };
    if (messages.length > 0) {
      latest_message = messages[0];
    }
    return latest_message;
  }

  static async get_reply_message(reply_id) {
    if (reply_id == 0) return [];

    let messages = await DB.get_data(
      "select * from chat_message where chat_message_id=:reply_id",
      { reply_id },
    );
    let response = {
      message: "Message supprimee",
      user_info: {
        user_id: 0,
        user_full_name: "",
        user_avatar: "",
        user_created_date: "",
      },
    };
    console.log("Reply messages");
    console.log(messages);
    if (messages.length > 0) {
      let user_info = await this.get_basic_info(messages[0].user_id);
      messages[0].user_info = user_info;
      response = messages;
    }

    return response;
  }

  static async get_basic_info(user_id) {
    let user_data = await DB.get_data(
      "select user_id,user_full_name,user_avatar,user_created_date from user where user_id=:user_id",
      { user_id },
    );
    return user_data[0];
  }

  static async count_total_message(chat_id) {
    let total = await DB.get_data(
      "select count(*) as total from chat_message where chat_id=:chat_id",
      {
        chat_id,
      },
    );
    return total[0].total;
  }

  static async count_total_unread(chat_id, user_id) {
    let total = await DB.get_data(
      "select count(*) as total from chat_message where chat_id=:chat_id and user_id<>:user_id and is_read=0",
      {
        chat_id,
        user_id,
      },
    );
    return total[0].total;
  }

  static sortMessages(chats) {
    let emptyChats = [];
    let chatsToSort = [];
    for (const contact of chats) {
      if (contact.recent_message.message == "Aucun message...") {
        emptyChats.push(contact);
      } else {
        chatsToSort.push(contact);
      }
    }
    chatsToSort.sort((a, b) => {
      const dateA = new Date(b.recent_message.created_at).getTime();
      const dateB = new Date(a.recent_message.created_at).getTime();
      return dateA - dateB;
    });
    chats = [...chatsToSort, ...emptyChats];
    return chats;
  }

  static async is_admin(user_id) {
    let users = await DB.get_data(
      "select * from admin where user_id=:user_id",
      { user_id },
    );
    return users.length > 0;
  }

  static async getUserContact(user_id) {
    let chats = await DB.get_data(
      "select * from chat where user_id=:user_id or with_user_id=:user_id ",
      { user_id },
    );
    let chats_to_send = [];
    for (let i = 0; i <= chats.length - 1; i++) {
      if (chats[i].with_user_id != 0) {
        if (chats[i].user_id != user_id) {
          chats[i].contact_info = await this.get_basic_info(
            chats[i].user_id,
          );
          chats[i].is_admin = await this.is_admin(chats[i].user_id);
        }
        if (chats[i].with_user_id != user_id) {
          chats[i].contact_info = await this.get_basic_info(
            chats[i].with_user_id,
          );
          chats[i].is_admin = await this.is_admin(
            chats[i].with_user_id,
          );
        }
        if (chats[i].contact_info != undefined) {
          chats[i].total_unread = await Chat_Controller.count_total_unread(
            chats[i].chat_id,
            user_id,
          );
          chats[i].recent_message = await Chat_Controller.get_recent_message(
            chats[i].chat_id,
          );
          chats_to_send.push(chats[i]);
        }
      }
    }
    return chats_to_send;
  }
}

module.exports.Chat_Controller = Chat_Controller;

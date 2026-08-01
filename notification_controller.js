const { DB } = require("../db");
const { PushService } = require("../services/pushService");
const Real_Time = require("../services/real_time");

class Notification_Controller {
  static new_notif(user_id, notif_content) {
    try {
      let created_at = new Date();
      DB.post_data(
        "insert into notification(user_id,notif_content,created_at) values(:user_id,:notif_content,:created_at)",
        { user_id, notif_content, created_at },
      );

      Real_Time.socket.to(`user-${user_id}`).emit("new_notif", {
        message: notif_content,
      });

      PushService.notifyUser(
        user_id,
        user_id,
        this.stripHtml(notif_content),
        "",
      );
    } catch (error) {
      console.log(error);
    }
  }

  static stripHtml(text) {
    return text.replace(/<[^>]*>/g, "");
  }
}

module.exports.Notification_Controller = Notification_Controller;

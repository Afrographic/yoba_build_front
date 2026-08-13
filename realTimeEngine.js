class RealTimeEngine {
  static socket;
  static init(io) {
    this.socket = io;
    io.on("connection", (socket) => {
      console.log("===============");
      console.log("New connection");
      console.log("===============");

      socket.on("disconnect", () => {
        console.log("===============");
        console.log("New Disconnection");
        console.log("===============");
      });

      socket.on("join_room", (chat_id) => {
        console.log("You joined room", chat_id);
        socket.join(chat_id);
      });

      socket.on("join_user_room", (user_room_id) => {
        console.log("You joined your room", user_room_id);
        socket.join(user_room_id);
      });

      socket.on("new_comment", (comment) => {
        socket.to(comment.chat_id).emit("new_comment", comment);
      });

      socket.on("delete_comment", (comment) => {
        socket.to(comment.chat_id).emit("delete_comment", comment);
      });

      socket.on("update_comment", (comment) => {
        socket.to(comment.chat_id).emit("update_comment", comment);
      });
    });
  }
}

module.exports = RealTimeEngine;

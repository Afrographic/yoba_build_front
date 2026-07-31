class RealTimeEngine {
  static init(io) {
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

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Thoth_DB } = require("../thoth_db");
const { Consts } = require("../consts");

class Security {
  static authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, Consts.ACCESS_TOKEN_SECRET, (err, user_data) => {
      if (err) return res.sendStatus(403);
      req.body.user_data = user_data;
      req.body.token = token;
      next();
    });
  }

  static async is_room_owner(req, res, next) {
    let user_id = req.body.user_data.user_id;
    let room_id = req.body.room_id;
    let rooms = await Thoth_DB.get_data(
      "select room_id from room where room_id = :room_id and user_id=:user_id",
      { room_id, user_id },
    );

    if (rooms.length > 0) {
      next();
    } else {
      res.sendStatus(403);
    }
  }
  static async is_admin(req, res, next) {
    let user_id = req.body.user_data.user_id;
    let admins = await Thoth_DB.get_data(
      "select * from admin where user_id=:user_id",
      { user_id },
    );

    if (admins.length > 0) {
      next();
    } else {
      res.sendStatus(403);
    }
  }

  static encryptPassword(password) {
    return crypto
      .createHmac("sha256", Consts.PASSWORD_HASHING_KEY)
      .update(password)
      .digest("hex");
  }

  static generateToken(user_data) {
    //Expire in 1 year
    return jwt.sign(
      { user_id: user_data.user_id },
      Consts.ACCESS_TOKEN_SECRET,
      { expiresIn: "31536000s" },
    );
  }

  static generate_password_token(userData) {
    // 10 min lasting token
    return jwt.sign(userData, Consts.ACCESS_TOKEN_SECRET, {
      expiresIn: "600s",
    });
  }
}

module.exports.Security = Security;

const express = require("express");
const router = express.Router();
const { Security } = require("../utils/security");
const { Validator } = require("../utils/validator");
const { HelperFunction } = require("../utils/helper_function");
const { HelperFile } = require("../utils/helper_file.js");
const { OwnerShipChecker } = require("../utils/ownership_checker.js");
const { Consts } = require("../consts.js");
const { serverError } = require("../utils/server_error.js");
const { DB } = require("../db.js");
const { SMS_Service } = require("../services/sms_service.js");
const { EmailService } = require("../services/email_service.js");
const { User_Controller } = require("../controllers/user_controller.js");

router.post("/create_account", async (req, res) => {
  try {
    let user_full_name = HelperFunction.Ucase(req.body.nom_complet);
    let user_email = req.body.email;
    let user_phone = req.body.phone;
    let pays_id = req.body.pays_id;
    let region_id = req.body.region_id;
    let ville_id = req.body.city_id;
    let grace_code_affiliation = req.body.grace_code_affiliation ?? "";
    // let user_password = Security.encryptPassword(req.body.password);
    let type = HelperFunction.Ucase(req.body.type);
    let user_avatar = `${Consts.backend_host}/backend_files/default_pic.svg`;

    let user_created_date = new Date();

    let email_already_exist =
      await User_Controller.email_already_exist(user_email);
    if (email_already_exist) {
      return res.status(409).send({ message: "Adresse email deja utilisé" });
    }
    let phone_already_exist =
      await User_Controller.phone_already_exist(user_phone);
    if (phone_already_exist) {
      return res
        .status(409)
        .send({ message: "Numéro de téléphone deja utilisé" });
    }

    let insert = await DB.post_data(
      "insert into user(user_avatar,user_email,user_phone,pays_id,region_id,ville_id,user_full_name,user_created_date,type,grace_code_affiliation) values(:user_avatar,:user_email,:user_phone,:pays_id,:region_id,:ville_id,:user_full_name,:user_created_date,:type,:grace_code_affiliation)",
      {
        user_avatar,
        user_email,
        user_phone,
        pays_id,
        region_id,
        ville_id,
        user_full_name,
        user_created_date,
        type,
        grace_code_affiliation,
      },
    );

    let user_id = insert[0];
    let code_affiliation = `BD${HelperFunction.generate4DigitsCode()}-${user_id}`;
    await DB.update_data(
      "update user set code_affiliation=:code_affiliation where user_id=:user_id",
      { code_affiliation, user_id },
    );

    //Create chat with admins
    User_Controller.create_chat_with_admins(user_id);

    let token = Security.generateToken({ user_id: user_id });
    let user_data = await User_Controller.get_user_data(user_id);
    res.send({ token: token, user_data: user_data });
  } catch (error) {
    serverError(error, res);
  }
});

//Validate token
router.get("/validate_token", Security.authenticateToken, async (req, res) => {
  try {
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

//Get user data
router.get("/user_data", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let user_data = await User_Controller.get_user_data(user_id);
    delete user_data.user_password;
    delete user_data.phone_verification_code;
    delete user_data.email_verification_code;
    delete user_data.login_code;
    delete user_data.password_reset_code;
    res.send(user_data);
  } catch (error) {
    serverError(error, res);
  }
});

//Login
router.post("/login", async (req, res) => {
  try {
    let email = req.body.email;

    let users = await DB.get_data(
      "select * from user where user_email=:email ",
      { email },
    );
    if (users.length == 0) {
      return res.sendStatus(404);
    }

    let login_code = HelperFunction.generate4DigitsCode();
    EmailService.send_email(
      email,
      "Code de connexion",
      `Votre code de connexion est <h2>${login_code}</h2>`,
    );
    await DB.update_data(
      "update user set login_code=:login_code where user_email=:email",
      { login_code, email },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

// //Login with token
router.post("/login_token", async (req, res) => {
  try {
    let login_code = req.body.login_code;
    let email = req.body.email;
    let users = await DB.get_data(
      "select * from user where user_email=:email and login_code=:login_code",
      { email, login_code },
    );
    if (users.length == 0) {
      return res.sendStatus(404);
    }
    let user_id = users[0].user_id;
    let token = Security.generateToken({ user_id: user_id });
    let monnaie = await User_Controller.get_user_monnaie(user_id);
    users[0].monnaie = monnaie;
    users[0].user_password = "";

    res.send({ token: token, user_data: users[0] });
  } catch (error) {
    serverError(error, res);
  }
});


//get total number of user
router.get("/total_user", async (req, res) => {
  try {
    let total = await DB.get_data("select count(*) as total from user");
    res.send({ total: total[0].total });
  } catch (error) {
    serverError(error, res);
  }
});

//get type of account
router.get("/check_if_admin", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let users = await DB.get_data(
      "select * from admin where user_id=:user_id",
      { user_id },
    );
    res.send({ is_admin: users.length > 0 });
  } catch (error) {
    serverError(error, res);
  }
});

//get user activation state
router.get(
  "/activation_state",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let users = await DB.get_data(
        "select * from user where user_id=:user_id and user_mail_verified =1 and user_phone_verified = 1",
        { user_id },
      );
      res.send({ activated: users.length > 0 });
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Update bio
router.patch("/user_bio", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let user_bio = req.body.user_bio;
    let lat = req.body.lat;
    let long = req.body.long;

    await DB.update_data(
      "update user set user_bio = :user_bio,geo_lat=:lat,geo_long=:long where user_id=:user_id",
      { user_id, user_bio, lat, long },
    );

    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

//update numero cni
router.patch(
  "/numero_id_card",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let numero_id_card = req.body.numero_id_card;
      //check if user already have that id numer
      let users = await DB.get_data(
        "select * from user where numero_id_card=:numero_id_card",
        { numero_id_card },
      );
      if (users.length > 0) {
        res.status(401).send("Ce numero de carte d'identite est deja utilise");
        return;
      }

      await DB.update_data(
        "update user set numero_id_card =:numero_id_card where user_id=:user_id",
        { numero_id_card, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Photo de face de la structure
router.patch(
  "/photo_face_structure",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      if (req.files == undefined) {
        return res.sendStatus(400);
      }

      let file = req.files.file;
      file.mv(
        `./public/backend_files/${HelperFunction.replace_space_with_underscore(file.name)}`,
      );
      let url = `${Consts.backend_host}/backend_files/${HelperFunction.replace_space_with_underscore(file.name)}`;

      await DB.update_data(
        "update user set photo_face_structure=:url where user_id=:user_id",
        { url, user_id },
      );

      res.send({ url: url });
    } catch (error) {
      serverError(error, res);
    }
  },
);

//save cni front and cni back
router.patch(
  "/cni_front_back",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;

      if (req.files == undefined) {
        return res.sendStatus(400);
      }

      let cni_front = req.files.cni_front;
      let cni_back = req.files.cni_back;

      let cni_front_name = `auth_${user_id}_${HelperFunction.generate4DigitsCode()}.png`;
      let cni_back_name = `auth_${user_id}_${HelperFunction.generate4DigitsCode()}.png`;

      cni_front.mv(`./public/backend_files/${cni_front_name}`);
      cni_back.mv(`./public/backend_files/${cni_back_name}`);

      let front_url = `${Consts.backend_host}/backend_files/${cni_front_name}`;
      let back_url = `${Consts.backend_host}/backend_files/${cni_back_name}`;

      await DB.update_data(
        "update user set cni_front=:front_url,cni_back=:back_url where user_id=:user_id",
        { front_url, back_url, user_id },
      );

      res.send({
        cni_front: front_url,
        cni_back: back_url,
      });
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Save photo + CNI
router.patch("/photo_cni", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    if (req.files == undefined) return res.sendStatus(400);
    let photo_cni = req.files.photo_cni;
    let photo_cni_name = `auth_photo_cni_${user_id}_${HelperFunction.generate4DigitsCode()}.png`;
    photo_cni.mv(`./public/backend_files/${photo_cni_name}`);
    let url = `${Consts.backend_host}/backend_files/${photo_cni_name}`;
    await DB.update_data(
      "update user set photo_cni=:url where user_id=:user_id",
      { url, user_id },
    );
    res.send({ photo_cni: url });
  } catch (error) {
    serverError(error, res);
  }
});

//Send email verification code
router.patch(
  "/email_verification_code",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let code = HelperFunction.generate4DigitsCode();
      await DB.update_data(
        "update user set email_verification_code=:code where user_id=:user_id",
        { code, user_id },
      );
      //Send email to user
      let user_data = await User_Controller.get_user_data(user_id);
      EmailService.send_email(
        user_data.user_email,
        "Verifiez l'email",
        "Votre Code de verification est " + code,
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//verify email
router.post("/verify_email", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let code = req.body.code;
    let users = await DB.get_data(
      "select user_id from user where user_id=:user_id and email_verification_code=:code",
      { user_id, code },
    );
    if (users.length > 0) {
      await DB.update_data(
        "update user set user_mail_verified = 1 where user_id=:user_id ",
        { user_id },
      );
      User_Controller.send_welcome_email(user_id);
    }
    res.send({ verified: users.length > 0 });
  } catch (error) {
    serverError(error, res);
  }
});

//send sms verification code
router.get("/send_sms_code", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let code = HelperFunction.generate4DigitsCode();
    await DB.update_data(
      "update user set phone_verification_code=:code where user_id=:user_id",
      { code, user_id },
    );
    //Send sms to user
    let user_data = await User_Controller.get_user_data(user_id);
    SMS_Service.send_message(
      "Votre code de verification sur bestdeal est " + code,
      user_data.user_phone,
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

//verify phone
router.post("/verify_phone", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let code = req.body.code;
    let users = await DB.get_data(
      "select user_id from user where user_id=:user_id and phone_verification_code=:code",
      { user_id, code },
    );
    if (users.length > 0) {
      await DB.update_data(
        "update user set user_phone_verified = 1 where user_id=:user_id",
        { user_id },
      );
    }
    res.send({ verified: users.length > 0 });
  } catch (error) {
    serverError(error, res);
  }
});

//alert admin to activate user
router.get("/alert_admin", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let alredy_exist = await DB.get_data(
      "select * from user_to_activate where user_id=:user_id",
      { user_id },
    );
    if (alredy_exist.length > 0) return res.sendStatus(200);
    await DB.post_data(
      "insert into user_to_activate(user_id) values(:user_id)",
      { user_id },
    );
    await DB.update_data(
      "update user set reject_message= NULL where user_id=:user_id",
      { user_id },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

// get users to activate
router.get(
  "/users_to_activate",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let users = await DB.get_data(
        "select * from user_to_activate where activated=0",
      );
      let users_bacs = [];
      for (const user of users) {
        let user_json = await User_Controller.get_user_data(user.user_id);
        users_bacs.unshift(user_json);
      }
      res.send(users_bacs);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//get user data
router.get(
  "/user_data/:user_id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let user_id = parseInt(req.params.user_id);
      let user_data = await User_Controller.get_user_data(user_id);
      res.send(user_data);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//reject user activation
router.patch(
  "/reject_user_activation/:user_id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let user_id = parseInt(req.params.user_id);
      let reject_message = req.body.reject_message ?? "";
      let desc = req.body.desc;
      let num_cni = req.body.num_cni;
      let front_cni = req.body.front_cni;
      let back_cni = req.body.back_cni;
      let photo_cni = req.body.photo_cni;
      let face_structure = req.body.face_structure;

      let zone_problemes = "";
      if (desc == 1) {
        zone_problemes += "Description, ";
        await DB.update_data(
          "update user set user_bio = NULL where user_id=:user_id",
          { user_id },
        );
      }
      if (num_cni == 1) {
        zone_problemes += "Numero de la CNI ou KIT recepisse, ";
        await DB.update_data(
          "update user set numero_id_card = NULL where user_id=:user_id",
          { user_id },
        );
      }
      if (front_cni == 1) {
        zone_problemes += "Face avant de la CNI, ";
        await DB.update_data(
          "update user set cni_front = NULL where user_id=:user_id",
          { user_id },
        );
      }
      if (back_cni == 1) {
        zone_problemes += "Face arriere de la CNI, ";
        await DB.update_data(
          "update user set cni_back = NULL where user_id=:user_id",
          { user_id },
        );
      }
      if (photo_cni == 1) {
        zone_problemes += "Photo avec la CNI, ";
        await DB.update_data(
          "update user set photo_cni = NULL where user_id=:user_id",
          { user_id },
        );
      }
      if (face_structure == 1) {
        zone_problemes += "Face avant de la structure, ";
        await DB.update_data(
          "update user set photo_face_structure = NULL where user_id=:user_id",
          { user_id },
        );
      }

      let reject_message_to_send = `Zones a problemes: ${zone_problemes} \n ${reject_message}`;

      await DB.update_data(
        "update user set reject_message=:reject_message_to_send where user_id=:user_id",
        { reject_message_to_send, user_id },
      );
      await DB.delete_data(
        "delete from user_to_activate where user_id=:user_id",
        { user_id },
      );

      let user_data = await User_Controller.get_user_data(user_id);
      let created_at = new Date();
      EmailService.send_email(
        user_data.user_email,
        "Votre compte a ete rejetee",
        reject_message_to_send,
      );
      reject_message_to_send = `Compte rejete \n ${reject_message_to_send}`;
      await DB.post_data(
        "insert into notification(user_id,notif_content,created_at) values(:user_id,:reject_message_to_send,:created_at)",
        { user_id, reject_message_to_send, created_at },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Activate user account
router.patch(
  "/activate_user/:user_id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let user_id = parseInt(req.params.user_id);
      await DB.update_data(
        "update user set reject_message= NULL where user_id=:user_id",
        { user_id },
      );
      await DB.update_data(
        "update user_to_activate set activated = 1 where user_id=:user_id",
        { user_id },
      );

      await DB.update_data(
        "update user set user_activated = 1 where user_id=:user_id",
        { user_id },
      );

      let user_data = await User_Controller.get_user_data(user_id);
      let created_at = new Date();

      let message_to_send =
        "Votre Compte a ete active - Profiter de votre experience dans BestDeal";
      EmailService.send_email(
        user_data.user_email,
        "Votre compte a ete Active",
        message_to_send,
      );
      await DB.post_data(
        "insert into notification(user_id,notif_content,created_at) values(:user_id,:message_to_send,:created_at)",
        { user_id, message_to_send, created_at },
      );

      //Give the money to the influencer
      //User_Controller.give_money_influencer_for_affiliation(user_id)
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Check if user account activated
router.get("/activated", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let users = await DB.get_data(
      "select * from user_to_activate where user_id=:user_id and activated=1",
      { user_id },
    );
    res.send({ activated: users.length > 0 });
  } catch (error) {
    serverError(error, res);
  }
});

//Delete account
router.delete(
  "/delete_account",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      //Delete user files
      let user_data = await User_Controller.get_user_data(user_id);
      HelperFile.deleteFileFromServer(user_data.user_avatar);
      HelperFile.deleteFileFromServer(user_data.cni_front);
      HelperFile.deleteFileFromServer(user_data.cni_back);
      HelperFile.deleteFileFromServer(user_data.photo_cni);
      HelperFile.deleteFileFromServer(user_data.photo_face_structure);

      await DB.delete_data("delete from user where user_id=:user_id", {
        user_id,
      });
      await DB.delete_data(
        "delete from user_to_activate where user_id=:user_id",
        { user_id },
      );
      await DB.delete_data("delete from offre where user_id=:user_id", {
        user_id,
      });
      await DB.delete_data(
        "delete from chat where user_id=:user_id or with_user_id =:user_id",
        { user_id, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Ban user
router.delete(
  "/ban_user/:user_id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let user_id = parseInt(req.params.user_id);
      //Delete user files
      let user_data = await User_Controller.get_user_data(user_id);
      HelperFile.deleteFileFromServer(user_data.user_avatar);
      HelperFile.deleteFileFromServer(user_data.cni_front);
      HelperFile.deleteFileFromServer(user_data.cni_back);
      HelperFile.deleteFileFromServer(user_data.photo_cni);
      HelperFile.deleteFileFromServer(user_data.photo_face_structure);

      await DB.delete_data("delete from user where user_id=:user_id", {
        user_id,
      });
      await DB.delete_data(
        "delete from user_to_activate where user_id=:user_id",
        { user_id },
      );
      await DB.delete_data("delete from offre where user_id=:user_id", {
        user_id,
      });
      await DB.delete_data(
        "delete from chat where user_id=:user_id or with_user_id =:user_id",
        { user_id, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Get reset code
router.post("/send_password_reset_code", async (req, res) => {
  try {
    let email = req.body.email;
    let users = await DB.get_data(
      "select user_id from user where user_email=:email",
      { email },
    );
    if (users.length == 0) return res.sendStatus(404);
    let user_id = users[0].user_id;
    let password_reset_code = HelperFunction.generate4DigitsCode();
    EmailService.send_email(
      email,
      `Reinitialisation du mot de passe`,
      `Votre code de reinitialisarion est ${password_reset_code}`,
    );
    await DB.update_data(
      "update user set password_reset_code=:password_reset_code where user_id=:user_id",
      { password_reset_code, user_id },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

//Reset password
router.post("/reset_password", async (req, res) => {
  try {
    let password_reset_code = req.body.password_reset_code;
    let password = req.body.password;
    let confirm_password = req.body.confirm_password;
    if (password != confirm_password) return res.sendStatus(400);
    password = Security.encryptPassword(password);
    let users = await DB.get_data(
      "select user_id from user where password_reset_code=:password_reset_code",
      { password_reset_code },
    );
    if (users.length == 0) return res.sendStatus(404);
    let user_id = users[0].user_id;
    await DB.update_data(
      "update user set user_password=:password where user_id=:user_id",
      { password, user_id },
    );

    let token = Security.generateToken({ user_id: user_id });
    let user_data = await User_Controller.get_user_data(user_id);
    res.send({ token: token, user_data: user_data });
  } catch (error) {
    serverError(error, res);
  }
});

// Mes fileuls
router.get("/filleuls", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let user_data = await User_Controller.get_user_data(user_id);
    let code_affiliation = user_data.code_affiliation;
    let filleuls = await DB.get_data(
      "select user_full_name,user_id from user where grace_code_affiliation=:code_affiliation",
      { code_affiliation },
    );
    for (let i = 0; i <= filleuls.length - 1; i++) {
      let user_id_po = filleuls[i].user_id;
      let users = await DB.get_data(
        "select user_id from user_to_activate where user_id=:user_id_po and activated=1",
        { user_id_po },
      );
      filleuls[i].activated = users.length > 0;
    }
    res.send(filleuls);
  } catch (error) {
    serverError(error, res);
  }
});

//Swap Account
router.patch("/swap_account", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let type = req.body.type;
    if (type.trim().length == 0) return res.sendStatus(400);
    await DB.update_data("update user set type=:type where user_id=:user_id", {
      type,
      user_id,
    });
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

//Edit account
router.patch("/edit_account", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let user_full_name = HelperFunction.Ucase(req.body.user_full_name);
    let user_email = req.body.user_email;
    let user_phone = req.body.user_phone;
    let pays_id = req.body.pays_id;
    let region_id = req.body.region_id;
    let ville_id = req.body.ville_id;
    let user_bio = req.body.user_bio ?? "";
    let quartier_rue = req.body.quartier_rue;

    if (req.files != undefined) {
      let photo_profile = req.files.photo_profile;
      photo_profile.mv(
        `./public/backend_files/bd${user_id}_${HelperFunction.replace_space_with_underscore(photo_profile.name)}`,
      );
      let url = `${Consts.backend_host}/backend_files/bd${user_id}_${HelperFunction.replace_space_with_underscore(photo_profile.name)}`;
      await DB.update_data(
        "update user set user_avatar=:url where user_id=:user_id",
        { url, user_id },
      );
    }

    let current_user = await User_Controller.get_user_data(user_id);

    if (current_user.user_email != user_email) {
      let email_already_exist =
        await User_Controller.email_already_exist(user_email);
      if (email_already_exist) {
        return res.status(409).send({ message: "Adresse email deja utilise" });
      }
    }

    if (current_user.user_phone != user_phone) {
      let phone_already_exist =
        await User_Controller.phone_already_exist(user_phone);
      if (phone_already_exist) {
        return res
          .status(409)
          .send({ message: "Numero de telephone deja utilise" });
      }
    }

    if (current_user.user_email != user_email) {
      //Validate email again
      await DB.update_data(
        "update user set user_mail_verified = 0 where user_id=:user_id",
        { user_id },
      );
    }
    if (current_user.user_phone != user_phone) {
      //Validate phone again
      await DB.update_data(
        "update user set user_phone_verified = 0 where user_id=:user_id",
        { user_id },
      );
    }

    await DB.update_data(
      "update user set user_full_name=:user_full_name, user_email=:user_email,user_phone=:user_phone,pays_id=:pays_id,region_id=:region_id,ville_id=:ville_id,user_bio=:user_bio,quartier_rue=:quartier_rue where user_id=:user_id",
      {
        user_full_name,
        user_email,
        user_phone,
        pays_id,
        region_id,
        ville_id,
        user_bio,
        quartier_rue,
        user_id,
      },
    );

    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

//Search user
router.post("/search_user", Security.authenticateToken, async (req, res) => {
  try {
    let search_token = req.body.search_token;
    let users = await DB.get_data(
      `select user_id,user_full_name,user_avatar,user_created_date,solde from user where user_full_name like '%${search_token}%' `,
      {},
    );
    res.send(users);
  } catch (error) {
    serverError(error, res);
  }
});

//Afficher le solde
router.post("/afficher_solde", Security.authenticateToken, async (req, res) => {
  try {
    let password = req.body.password;
    password = Security.encryptPassword(password);
    let user_id = req.body.user_data.user_id;
    let users = await DB.get_data(
      "select user_id from user where user_id=:user_id and user_password=:password",
      { password, user_id },
    );
    res.send({
      show: users.length > 0,
    });
  } catch (error) {
    serverError(error, res);
  }
});

//Edit geo coordinate
router.patch("/geo-coords", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let geo_lat = req.body.geo_lat;
    let geo_long = req.body.geo_long;
    await DB.update_data(
      "update user set geo_lat=:geo_lat,geo_long=:geo_long where user_id=:user_id",
      {
        geo_lat,
        geo_long,
        user_id,
      },
    );
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});
module.exports = router;

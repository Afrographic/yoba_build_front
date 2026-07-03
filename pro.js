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
const { Offre_Controller } = require("../controllers/offre_controller.js");
const {
  OffreVideoRepository,
} = require("../repositories/offre_video_repository.js");
const { OffreService } = require("../services/offre_service.js");
const {
  Notification_Controller,
} = require("../controllers/notification_controller.js");

router.post("/diplome", Security.authenticateToken, async (req, res) => {
  try {
    if (req.files == undefined) return res.sendStatus(400);
    let file = req.files["doc"];
    file.mv(`./public/backend_files/${file.name}`);
    let url = `${Consts.backend_host}/backend_files/${file.name}`;

    let user_id = req.body.user_data.user_id;
    let data = await DB.get_data(
      "select * from user_pro where user_id=:user_id",
      { user_id },
    );
    if (data.length > 0) {
      if (data[0].diplome != null) {
        HelperFile.deleteFileFromServer(data[0].diplome);
      }

      await DB.update_data(
        "update user_pro set diplome=:url,diplome_ok=0 where user_id=:user_id",
        {
          url,
          user_id,
        },
      );
    } else {
      await DB.post_data(
        "insert into user_pro(diplome,user_id) values(:url,:user_id)",
        {
          url,
          user_id,
        },
      );
    }
    res.sendStatus(200);
  } catch (error) {
    serverError(error, res);
  }
});

router.get("/diplome", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let data = await DB.get_data(
      "select * from user_pro where user_id=:user_id",
      { user_id },
    );
    if (data.length > 0) {
      res.send({ diplome: data[0].diplome });
    } else {
      res.send({ diplome: null });
    }
  } catch (error) {
    serverError(error, res);
  }
});

router.get(
  "/admin-diplome",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let data = await DB.get_data(
        "select * from user_pro where diplome_ok=0 and diplome is not null",
      );
      for (let i = 0; i <= data.length - 1; i++) {
        let user_id = data[i].user_id;
        let user_info = await User_Controller.get_basic_info(user_id);
        data[i].user_info = user_info;
      }
      res.send(data);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/valider/admin-diplome/:user_id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let user_id = parseInt(req.params.user_id);
      await DB.update_data(
        "update user_pro set diplome_ok=1 where user_id=:user_id",
        { user_id },
      );
      Notification_Controller.new_notif(
        user_id,
        `Votre diplome a été validé par l'administration`,
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/rejeter/admin-diplome/:user_id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let motif = req.body.motif ?? "";
      //Delete current diplome
      let data = await DB.get_data(
        "select * from user_pro where user_id=:user_id",
        { user_id: parseInt(req.params.user_id) },
      );
      if (data.length > 0 && data[0].diplome != null) {
        HelperFile.deleteFileFromServer(data[0].diplome);
      }
      //Update database
      let user_id = parseInt(req.params.user_id);
      await DB.update_data(
        "update user_pro set diplome_ok=0,diplome=null where user_id=:user_id",
        { user_id },
      );
      Notification_Controller.new_notif(
        user_id,
        `Votre diplome a été rejeté par l'administration - ${motif}`,
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.post(
  "/attestation-fiscale",
  Security.authenticateToken,
  async (req, res) => {
    try {
      if (req.files == undefined) return res.sendStatus(400);
      let file = req.files["doc"];
      file.mv(
        `./public/backend_files/${HelperFunction.replace_space_with_underscore(file.name)}`,
      );
      let url = `${Consts.backend_host}/backend_files/${HelperFunction.replace_space_with_underscore(file.name)}`;

      let user_id = req.body.user_data.user_id;
      let data = await DB.get_data(
        "select * from user_pro where user_id=:user_id",
        { user_id },
      );
      if (data.length > 0) {
        if (data[0].attestation_fiscale != null) {
          HelperFile.deleteFileFromServer(data[0].attestation_fiscale);
        }
        await DB.update_data(
          "update user_pro set attestation_fiscale=:url,fiscale_ok=0 where user_id=:user_id",
          {
            url,
            user_id,
          },
        );
      } else {
        await DB.post_data(
          "insert into user_pro(attestation_fiscale,user_id) values(:url,:user_id)",
          {
            url,
            user_id,
          },
        );
      }
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get("/fiscale", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let data = await DB.get_data(
      "select * from user_pro where user_id=:user_id",
      { user_id },
    );
    if (data.length > 0) {
      res.send({ attestation_fiscale: data[0].attestation_fiscale });
    } else {
      res.send({ attestation_fiscale: null });
    }
  } catch (error) {
    serverError(error, res);
  }
});

router.get(
  "/admin-fiscale",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let data = await DB.get_data(
        "select * from user_pro where fiscale_ok=0 and attestation_fiscale is not null",
      );
      for (let i = 0; i <= data.length - 1; i++) {
        let user_id = data[i].user_id;
        let user_info = await User_Controller.get_basic_info(user_id);
        data[i].user_info = user_info;
      }
      res.send(data);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/rejeter/admin-fiscale/:user_id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let motif = req.body.motif ?? "";
      //Delete current attestation_fiscale
      let data = await DB.get_data(
        "select * from user_pro where user_id=:user_id",
        { user_id: parseInt(req.params.user_id) },
      );
      if (data.length > 0 && data[0].attestation_fiscale != null) {
        HelperFile.deleteFileFromServer(data[0].attestation_fiscale);
      }
      //Update database
      let user_id = parseInt(req.params.user_id);
      await DB.update_data(
        "update user_pro set fiscale_ok=0,attestation_fiscale=null where user_id=:user_id",
        { user_id },
      );
      Notification_Controller.new_notif(
        user_id,
        `Votre attestation fiscale a été rejeté par l'administration - ${motif}`,
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/valider/admin-fiscale/:user_id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let user_id = parseInt(req.params.user_id);
      await DB.update_data(
        "update user_pro set fiscale_ok=1 where user_id=:user_id",
        { user_id },
      );
      Notification_Controller.new_notif(
        user_id,
        `Votre Attestation fiscale a été validé par l'administration`,
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.post(
  "/registre-commerce",
  Security.authenticateToken,
  async (req, res) => {
    try {
      if (req.files == undefined) return res.sendStatus(400);
      let file = req.files["doc"];
      file.mv(
        `./public/backend_files/${HelperFunction.replace_space_with_underscore(file.name)}`,
      );
      let url = `${Consts.backend_host}/backend_files/${HelperFunction.replace_space_with_underscore(file.name)}`;

      let user_id = req.body.user_data.user_id;
      let data = await DB.get_data(
        "select * from user_pro where user_id=:user_id",
        { user_id },
      );
      if (data.length > 0) {
        if (data[0].registre_commerce != null) {
          HelperFile.deleteFileFromServer(data[0].registre_commerce);
        }

        await DB.update_data(
          "update user_pro set registre_commerce=:url,registre_ok=0 where user_id=:user_id",
          {
            url,
            user_id,
          },
        );
      } else {
        await DB.post_data(
          "insert into user_pro(registre_commerce,user_id) values(:url,:user_id)",
          {
            url,
            user_id,
          },
        );
      }
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get("/commerce", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let data = await DB.get_data(
      "select * from user_pro where user_id=:user_id",
      { user_id },
    );
    if (data.length > 0) {
      res.send({ registre_commerce: data[0].registre_commerce });
    } else {
      res.send({ registre_commerce: null });
    }
  } catch (error) {
    serverError(error, res);
  }
});

router.get(
  "/admin-registre",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let data = await DB.get_data(
        "select * from user_pro where registre_ok=0 and registre_commerce is not null",
      );
      for (let i = 0; i <= data.length - 1; i++) {
        let user_id = data[i].user_id;
        let user_info = await User_Controller.get_basic_info(user_id);
        data[i].user_info = user_info;
      }
      res.send(data);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/rejeter/admin-registre/:user_id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let motif = req.body.motif ?? "";
      //Delete current diplome
      let data = await DB.get_data(
        "select * from user_pro where user_id=:user_id",
        { user_id: parseInt(req.params.user_id) },
      );
      if (data.length > 0 && data[0].registre_commerce != null) {
        HelperFile.deleteFileFromServer(data[0].registre_commerce);
      }
      //Update database
      let user_id = parseInt(req.params.user_id);
      await DB.update_data(
        "update user_pro set registre_ok=0,registre_commerce=null where user_id=:user_id",
        { user_id },
      );
      Notification_Controller.new_notif(
        user_id,
        `Votre Registre de commerce a été rejeté par l'administration - ${motif}`,
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/valider/admin-registre/:user_id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let user_id = parseInt(req.params.user_id);
      await DB.update_data(
        "update user_pro set registre_ok=1 where user_id=:user_id",
        { user_id },
      );
      Notification_Controller.new_notif(
        user_id,
        `Votre registre de commerce a été validé par l'administration`,
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get(
  "/user-pro/:user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = parseInt(req.params.user_id);
      let data = await DB.get_data(
        "select * from user_pro where user_id=:user_id",
        { user_id },
      );
      res.send(data);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

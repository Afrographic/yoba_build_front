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

const { v4: uuidv4 } = require("uuid");

router.get("/offre/:offset", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let offset = parseInt(req.params.offset);
    let limit = 30;

    let offres = await DB.get_data(
      "select * from offre where user_id=:user_id  order by  offre_id DESC limit :limit offset :offset",
      { user_id, offset, limit },
    );

    //Get Offre meta data
    offres = await Offre_Controller.getOffreMetadatas(user_id, offres);

    res.send(offres);
  } catch (error) {
    serverError(error, res);
  }
});

router.get(
  "/offre_item/:offre_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let offre_id = parseInt(req.params.offre_id);
      let offres = await DB.get_data(
        "select * from offre where offre_id=:offre_id",
        { offre_id },
      );
      if (offres.length == 0) return res.sendStatus(404);
      //Get Offre meta data
      offres = await Offre_Controller.getOffreMetadatas(user_id, offres);
      res.send(offres);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Get next offer
router.get(
  "/next_offer/:offre_id/region/:region_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let offre_id = parseInt(req.params.offre_id);
      let region_id = parseInt(req.params.region_id);
      let offres = await DB.get_data(
        "select * from offre where offre_id = :offre_id - 1 and region_id=:region_id  limit 1",
        { offre_id, region_id, offre_id },
      );
      offres = await Offre_Controller.getOffreMetadatas(user_id, offres);
      res.send(offres);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get("/total_offre", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let total = await DB.get_data(
      "select count(*) as total from offre where user_id = :user_id",
      { user_id },
    );
    res.send({ total: total[0].total });
  } catch (error) {
    serverError(error, res);
  }
});

router.post("/add_offre", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let user_data = await User_Controller.get_user_data(user_id);
    let type = user_data.type;
    if (req.files == undefined) {
      return res.sendStatus(400);
    }
    let offre_description = req.body.desc;
    let offre_prix = req.body.price;
    let offre_titre = req.body.title;
    let is_offre = req.body.is_offre;
    let categorie_sous_id = req.body.categorie_sous_id;
    let created_at = new Date();

    let city_id = user_data.ville_id;
    let region_id = user_data.region_id;
    let country_id = user_data.pays_id;

    //Create offer
    let insert = await DB.post_data(
      "insert into offre(is_offre,city_id,region_id,country_id,offre_description,user_id,offre_prix,offre_titre,created_at,type,categorie_sous_id) values(:is_offre,:city_id,:region_id,:country_id,:offre_description,:user_id,:offre_prix,:offre_titre,:created_at,:type,:categorie_sous_id)",
      {
        is_offre,
        city_id,
        region_id,
        country_id,
        offre_description,
        user_id,
        offre_prix,
        offre_titre,
        created_at,
        type,
        categorie_sous_id,
      },
    );

    //Upload and save images
    let offre_id = insert[0];

    //Notify user on the region
    OffreService.notifyUserOnSameRegion(
      user_id,
      user_data.user_full_name,
      region_id,
      offre_id,
      offre_titre,
      offre_description,
    );

    for (const file_s in req.files) {
      let file = req.files[file_s];
      let id = uuidv4();
      file.mv(
        `./public/backend_files/bd_${id}_${offre_id}${HelperFunction.replace_space_with_underscore(file.name)}`,
      );
      let url = `${Consts.backend_host}/backend_files/bd_${id}_${offre_id}${HelperFunction.replace_space_with_underscore(file.name)}`;
      if (file_s.includes("img")) {
        await DB.post_data(
          "insert into offre_image(url,offre_id,user_id) values(:url,:offre_id,:user_id)",
          { url, offre_id, user_id },
        );
      } else {
        await OffreVideoRepository.save(url, offre_id);
      }
    }

    res.send({ offre_id: offre_id });
  } catch (error) {
    serverError(error, res);
  }
});

router.delete(
  "/offre/:offre_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let offre_id = parseInt(req.params.offre_id);
      let user_id = req.body.user_data.user_id;
      //Delete images from server
      let offres_images = await Offre_Controller.get_offre_images(offre_id);
      for (const item of offres_images) {
        HelperFile.deleteFileFromServer(item.url);
      }

      //Delete videos from server
      let offres_videos = await OffreVideoRepository.get(offre_id);
      for (const item of offres_videos) {
        HelperFile.deleteFileFromServer(item.url);
      }

      await DB.delete_data(
        "delete from offre where offre_id=:offre_id and user_id=:user_id",
        { offre_id, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.delete(
  "/delete_image_offre/:id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let id = parseInt(req.params.id);
      let offre_image = await Offre_Controller.get_single_offre_image(id);
      HelperFile.deleteFileFromServer(offre_image.url);
      await DB.delete_data(
        "delete from offre_image where offre_image_id=:id and user_id=:user_id",
        { id, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.patch(
  "/offre/:offre_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let offre_id = parseInt(req.params.offre_id);
      let offre_description = req.body.offre_description;
      let offre_prix = req.body.offre_prix;
      let offre_titre = req.body.offre_titre;

      await DB.update_data(
        "update offre set offre_description=:offre_description,offre_prix=:offre_prix,offre_titre=:offre_titre where offre_id=:offre_id and user_id=:user_id",
        { offre_description, offre_prix, offre_titre, offre_id, user_id },
      );
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//add image
router.post(
  "/offre_image/:offre_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let offre_id = req.params.offre_id;
      if (req.files == undefined) return res.sendStatus(404);
      for (const file_s in req.files) {
        let file = req.files[file_s];
        let id = uuidv4();
        file.mv(
          `./public/backend_files/bd_${offre_id}_${id}_${HelperFunction.replace_space_with_underscore(file.name)}`,
        );
        let url = `${Consts.backend_host}/backend_files/bd_${offre_id}_${id}_${HelperFunction.replace_space_with_underscore(file.name)}`;
        await DB.post_data(
          "insert into offre_image(url,offre_id) values(:url,:offre_id)",
          { url, offre_id },
        );
      }
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Search for a product in a user store
router.post(
  "/search_offre/:user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = parseInt(req.params.user_id);
      let search_token = req.body.search_token;
      let offres = await DB.get_data(
        `select * from offre where offre_titre like '%${search_token}%' and user_id=${user_id}`,
        {},
      );
      //Get images
      offres = await Offre_Controller.getOffreMetadatas(user_id, offres);
      res.send(offres);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Search for a product in a user store
router.post(
  "/search_offre/:user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id_loggeIn = req.body.user_data.user_id;
      let user_id = parseInt(req.params.user_id);
      let search_token = req.body.search_token;
      let offres = await DB.get_data(
        `select * from offre where offre_titre like '%${search_token}%' and user_id=${user_id}`,
        {},
      );
      offres = await Offre_Controller.getOffreMetadatas(
        user_id_loggeIn,
        offres,
      );
      res.send(offres);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Search for a product everywhere
router.post(
  "/search_offre_region",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let region_id = parseInt(req.params.region_id);
      let search_token = req.body.search_token;
      let offres = await DB.get_data(
        `select * from offre where offre_titre like '%${search_token}%'`,
        {},
      );
      offres = await Offre_Controller.getOffreMetadatas(user_id, offres);
      res.send(offres);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Offre client par region
router.get(
  "/offre_clients/:region_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
       let user_id = req.body.user_data.user_id;
      let region_id = parseInt(req.params.region_id);
      let type = "Mobile";
      //let type = "Client";
      let offres = await DB.get_data(
        "select * from offre where type=:type and region_id=:region_id order by offre_id DESC limit 15 ",
        { type, region_id },
      );
      offres = await Offre_Controller.getOffreMetadatas(user_id, offres);
      res.send(offres);
    } catch (error) {
      serverError(error, res);
    }
  },
);
router.get(
  "/offre_detaillant/:region_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
       let user_id = req.body.user_data.user_id;
      let region_id = parseInt(req.params.region_id);
      let type = "Detaillant";
      let offres = await DB.get_data(
        "select * from offre where type=:type and region_id=:region_id order by offre_id DESC limit 15 ",
        { type, region_id },
      );
      offres = await Offre_Controller.getOffreMetadatas(user_id, offres);
      res.send(offres);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get(
  "/offre_gestionnaire/:region_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let region_id = parseInt(req.params.region_id);
      let type = "Gestionnaire";
      let offres = await DB.get_data(
        "select * from offre where type=:type and region_id=:region_id order by offre_id DESC limit 15 ",
        { type, region_id },
      );
      offres = await Offre_Controller.getOffreMetadatas(user_id, offres);
      res.send(offres);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get(
  "/offre_fournisseur/:region_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id = req.body.user_data.user_id;
      let region_id = parseInt(req.params.region_id);
      let type = "Fournisseur";
      let offres = await DB.get_data(
        "select * from offre where type=:type and region_id=:region_id order by offre_id DESC limit 15 ",
        { type, region_id },
      );
      offres = await Offre_Controller.getOffreMetadatas(user_id, offres);
      res.send(offres);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Search for a product in a user store
router.post(
  "/search_offre/:user_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let user_id_loggedIn = req.body.user_data.user_id;
      let user_id = parseInt(req.params.user_id);
      let search_token = req.body.search_token;
      let offres = await DB.get_data(
        `select * from offre where offre_titre like '%${search_token}%' and user_id=${user_id}`,
        {},
      );
      offres = await Offre_Controller.getOffreMetadatas(user_id_loggedIn,offres);
      res.send(offres);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//Search for a product in a user store
router.post(
  "/search_offre_to_delete",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
       let user_id = req.body.user_data.user_id;
      let search_token = req.body.search_token;
      let offres = await DB.get_data(
        `select * from offre where offre_titre like '%${search_token}%' or offre_description like '%${search_token}%'`,
        {},
      );
      offres = await Offre_Controller.getOffreMetadatas(user_id,offres);
      res.send(offres);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.delete(
  "/admin_offre_delete/:offre_id",
  [Security.authenticateToken, Security.is_admin],
  async (req, res) => {
    try {
      let offre_id = parseInt(req.params.offre_id);
      //Delete images from server
      let offres_images = await Offre_Controller.get_offre_images(offre_id);
      for (const item of offres_images) {
        HelperFile.deleteFileFromServer(item.url);
      }
      await DB.delete_data("delete from offre where offre_id=:offre_id", {
        offre_id,
      });
      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;

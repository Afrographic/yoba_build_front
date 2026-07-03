const { DB } = require("../db");
const {
  OffreVideoRepository,
} = require("../repositories/offre_video_repository");
const { User_Controller } = require("./user_controller");

class Offre_Controller {
  static async get_offre_item(user_id,offre_id) {
    let offres = await DB.get_data(
      "select * from offre where offre_id=:offre_id",
      { offre_id },
    );
    if (offres.length == 0) return;
    let offre = offres[0];
    offre = await this.get_offre_data(user_id,offre);
    return offre;
  }

  static async get_offre_images(offre_id) {
    let offres = await DB.get_data(
      "select * from offre_image where offre_id=:offre_id",
      { offre_id },
    );
    return offres;
  }
  static async get_single_offre_image(id) {
    let offre_images = await DB.get_data(
      "select * from offre_image where offre_image_id=:id",
      { id },
    );
    return offre_images[0];
  }

  static async getOffreMetadatas(user_id, offres) {
    for (const offre of offres) {
      let index = offres.indexOf(offre);
      offres[index] = await this.get_offre_data(user_id, offre);
    }
    return offres;
  }

  static async get_offre_data(user_id, offre) {
    offre.images = await Offre_Controller.get_offre_images(offre.offre_id);
    offre.videos = await OffreVideoRepository.get(offre.offre_id);
    offre.monnaie = await User_Controller.get_user_monnaie(offre.user_id);
    offre.address = await User_Controller.get_address(offre.user_id);
    offre.user_info = await User_Controller.get_basic_info(offre.user_id);
    offre.is_liked = await Offre_Controller.isLiked(user_id, offre.offre_id);
    return offre;
  }

  static async isLiked(user_id, offre_id) {
    let data = await DB.get_data(
      "select * from favoris where user_id=:user_id and offre_id=:offre_id",
      { user_id, offre_id },
    );
    return data.length > 0;
  }
}

module.exports.Offre_Controller = Offre_Controller;

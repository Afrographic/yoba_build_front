const { DB } = require("../db");

class Retrait_Controller{
    static async get_user_meta_data(user_id){
        let user_data = await DB.get_data("select num_retrait,nom_retrait,operateur from user where user_id=:user_id",{user_id});
        return user_data[0];
    }
    static async get_retrait_data(retrait_id){
        let retraits = await DB.get_data("select * from retrait where retrait_id=:retrait_id",{retrait_id});
        return retraits[0];
    }
}

module.exports.Retrait_Controller = Retrait_Controller;
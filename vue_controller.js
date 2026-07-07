const { DB } = require("../db");

class Vue_Controller{
    static async add_vue(user_id,offre_id){
        let vues = await DB.get_data("select * from vue where user_id=:user_id and offre_id=:offre_id",{user_id,offre_id});
        if(vues.length > 0) return;
        await DB.post_data("insert into vue(user_id,offre_id) values(:user_id,:offre_id)",{user_id,offre_id})
    }

    static async count_vue(offre_id){
        let total = await DB.get_data("select count(*) as total from vue where offre_id=:offre_id",{offre_id});
        return total[0].total;
    }
}

module.exports.Vue_Controller = Vue_Controller;
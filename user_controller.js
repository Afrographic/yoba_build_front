const { DB } = require("../db");
const { EmailService } = require("../services/email_service");
const { HelperFunction } = require("../utils/helper_function");
const { Notification_Controller } = require("./notification_controller");

class User_Controller {
  static async is_admin(user_id) {
    let users = await DB.get_data(
      "select * from admin where user_id=:user_id",
      { user_id },
    );
    return users.length > 0;
  }

  static async email_already_exist(email) {
    let users = await DB.get_data(
      "select * from user where user_email=:email",
      { email },
    );
    return users.length > 0;
  }

  static async phone_already_exist(phone) {
    let users = await DB.get_data(
      "select * from user where user_phone =:phone",
      { phone },
    );
    return users.length > 0;
  }

  static async get_user_data(user_id) {
    let users = await DB.get_data("select * from user where user_id=:user_id", {
      user_id,
    });
    //admin check
    let admins = await DB.get_data(
      "select * from admin where user_id=:user_id",
      { user_id },
    );
    users[0].is_admin = admins.length > 0;

    //activated check
    let usersActivated = await DB.get_data(
      "select * from user_to_activate where user_id=:user_id and activated=1",
      { user_id },
    );
    users[0].activated = usersActivated.length > 0;

    //min retrait
    let min = await DB.get_data("select * from min_retrait");
    users[0].min_retrait = min[0].min;

    //is nextbridge agent
    let agents = await DB.get_data(
      "select * from nextbridge where user_id=:user_id",
      { user_id },
    );

    if (agents.length > 0) {
      users[0].agent = agents[0];
      users[0].is_agent = agents[0].active == 1;
      users[0].is_agent_verification_pending = this.agent_verification_pending(
        agents[0],
      );
    }

    users[0].monnaie = await this.get_user_monnaie(user_id);
    users[0].user_avatar_real = users[0].user_avatar;
    delete users[0].user_password;
    delete users[0].phone_verification_code;
    delete users[0].email_verification_code;
    delete users[0].login_code;
    delete users[0].password_reset_code;
    return users[0];
  }

  static agent_verification_pending(agent) {
    return (
      agent.services != null &&
      agent.description != null &&
      agent.moyens_transport != null &&
      agent.disponibilite != null &&
      agent.zones != null &&
      agent.frais_deplacement != null &&
      agent.prix_km != null &&
      agent.prix_verification != null &&
      agent.commission_achat != null &&
      agent.docs != null &&
      agent.rejected == 0
    );
  }

  static async send_welcome_email(user_id) {
    let user_data = await this.get_user_data(user_id);

    let email = user_data.user_email;
    let user_full_name = user_data.user_full_name;
    let objet = `Bienvenue sur BestDeal`;
    let body = `
        Bonjour ${user_full_name}

        <p>Bienvenue dans la communaute BestDeal! Nous sommes ravis de vous compter parmi nous.</p>

        <p>Grace a BestDeal, Vous pouvez publier et consulter des offres et services autour de vous .</p>

        <p>Si vous avez la moindre question, notre equipe est la pour vous aider. Il vous suffit de repondre a cet email ou de consulter notre centre d'aide.</p>

        <p>Encore une fois , bienvenue!
        A tres bientot.</p>

        <p>L'equipe BestDeal.</p>
        `;
    EmailService.send_email(email, objet, body);
  }

  static async get_address(user_id) {
    let address = {};
    let user_data = await this.get_user_data(user_id);
    //Get Country
    let country_id = user_data.pays_id;
    let countries = await DB.get_data(
      "select country_name from country where country_id=:country_id",
      { country_id },
    );
    address.country_name = countries[0].country_name;
    //get region
    let region_id = user_data.region_id;
    let regions = await DB.get_data(
      "select region_name from region where region_id=:region_id",
      { region_id },
    );
    address.region_name = regions[0].region_name;
    //Get city
    let city_id = user_data.ville_id;
    let cities = await DB.get_data(
      "select city_name from city where city_id=:city_id",
      { city_id },
    );
    address.city_name = cities[0].city_name;
    //add rue-quartier
    if (user_data.quartier_rue != null) {
      address.quartier_rue = user_data.quartier_rue;
    }

    address.lat = user_data.geo_lat;
    address.long = user_data.geo_long;
    return address;
  }

  static async get_basic_info(user_id) {
    let user_data = await DB.get_data(
      "select user_id,user_full_name,user_avatar,user_created_date,geo_lat,geo_long from user where user_id=:user_id",
      { user_id },
    );

    //activated check
    let usersActivated = await DB.get_data(
      "select * from user_to_activate where user_id=:user_id and activated=1",
      { user_id },
    );
    user_data[0].activated = usersActivated.length > 0;
    user_data[0].address = await this.get_address(user_id);
    return user_data[0];
  }

  static async give_money_influencer_for_affiliation(user_id, amount) {
    let user_data = await this.get_user_data(user_id);
    let grace_code_affiliation = user_data.grace_code_affiliation;
    let users = await DB.get_data(
      "select user_id from user where code_affiliation=:grace_code_affiliation",
      { grace_code_affiliation },
    );
    if (users.length == 0) return;
    let user_id_2 = users[0].user_id;
    let user_data_2 = await this.get_user_data(user_id_2);
    await DB.update_data(
      "update user set solde = solde + :amount where user_id=:user_id_2",
      { amount, user_id_2 },
    );
    let message;
    if (amount == 100) {
      message = `🎉 Bonne nouvelle ! Un de vos filleuls vient de rejoindre BestDeal. ${amount} FCFA ont été crédités sur votre portefeuille. Continuez à parrainer pour gagner davantage !`;
    } else {
      message = `🎉 Bonne nouvelle ! Un de vos filleuls vient d'acheter un espace publicitaire. ${amount} FCFA ont été crédités sur votre portefeuille. Continuez à parrainer pour gagner davantage !`;
    }

    Notification_Controller.new_notif(user_id_2, message);
    EmailService.send_email(
      user_data_2.user_email,
      `Vous beneficiez de ${amount} FCFA sur BestDeal`,
      message,
    );
  }

  static async create_chat_with_admins(user_id) {
    let admins = await DB.get_data("select * from admin ");
    for (let admin of admins) {
      let with_user_id = admin.user_id;
      await DB.post_data(
        "insert into chat(user_id,with_user_id) values(:user_id,:with_user_id)",
        { user_id, with_user_id },
      );
    }
  }

  static async get_user_monnaie(user_id) {
    let users = await DB.get_data(
      "select pays_id from user where user_id=:user_id",
      { user_id },
    );
    let country_id = users[0].pays_id;
    let countries = await DB.get_data(
      "select * from country where country_id=:country_id",
      { country_id },
    );
    return countries[0].monnaie;
  }

  static async notifyAdminsForNewRecharge(user_id, amount) {
    let user_data = await this.get_basic_info(user_id);
    let admins = await DB.get_data("select * from admin");
    for (const item of admins) {
      let admin_data = await this.get_user_data(item.user_id);
      let msg = `${user_data.user_full_name} Souhaite faire une recharge de ${HelperFunction.format_number(amount)} XAF`;
      Notification_Controller.new_notif(item.user_id, msg);
      EmailService.send_email(
        admin_data.user_email,
        "Demande de Recharge",
        msg,
      );
    }
  }

  static async notifyAdminsForNewRetrait(user_id, amount) {
    let user_data = await this.get_basic_info(user_id);
    let admins = await DB.get_data("select * from admin");
    for (const item of admins) {
      let admin_data = await this.get_user_data(item.user_id);
      let msg = `${user_data.user_full_name} Souhaite faire un retrait de ${HelperFunction.format_number(amount)} XAF`;
      Notification_Controller.new_notif(item.user_id, msg);
      EmailService.send_email(admin_data.user_email, "Demande de Retrait", msg);
    }
  }
}

module.exports.User_Controller = User_Controller;

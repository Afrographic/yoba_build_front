const { DB } = require("../db");

class MissionService {
  static async get(mission_id) {
    let missions = await DB.get_data(
      "select * from mission where id=:mission_id",
      { mission_id },
    );
    if (missions.length == 0) return {};
    let service_id = missions[0].service_id;
    let services = await DB.get_data(
      "select * from agent_type_service where id=:service_id",
      { service_id },
    );
    let service = services[0].titre;
    missions[0].service = service;
    return missions[0];
  }
}

module.exports.MissionService = MissionService;

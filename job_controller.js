const { DB } = require("../db");
const { StructureService } = require("../services/structure_service");

class JobController {
  static async getJobsDetails(jobs) {
    for (let i = 0; i <= jobs.length - 1; i++) {
      let structure_id = jobs[i].structure_id;
      let data = await DB.get_data(
        "select * from structures where id=:structure_id",
        { structure_id },
      );
      let metaData = await StructureService.getMetaData(structure_id);
      data[0].reviews = metaData.reviews;
      jobs[i].structure = data;
    }
    return jobs;
  }

  static async getSingleJobDetails(job_id) {
    let data2 = await DB.get_data("select * from emplois where id=:job_id", {
      job_id,
    });
    let job = data2[0];

    let structure_id = job.structure_id;
    let data = await DB.get_data(
      "select * from structures where id=:structure_id",
      { structure_id },
    );
    let metaData = await StructureService.getMetaData(structure_id);
    data[0].reviews = metaData.reviews;
    job.structure = data;

    return job;
  }
}

module.exports.JobController = JobController;

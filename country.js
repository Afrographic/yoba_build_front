const express = require("express");
const { Thoth_DB } = require("../thoth_db.js");
const router = express.Router();
const Axios_Private = require("../utils/axios");
const { Security } = require("../utils/security");
const { serverError } = require("../utils/server_error");


async function insert_country() {
    let res = await Axios_Private.get_external_data("https://restcountries.com/v2/all?fields=name,flag");
    let countries = res;
    for (country of countries) {
        await insert_country_to_db(country.name, country.flag);
    }
}

async function insert_country_to_db(name, flag) {
    let country_created_date = new Date();
    await Thoth_DB.post_data("INSERT INTO  country(country_name,country_flag,country_created_date) VALUES(:name,:flag,:country_created_date)", { name, flag, country_created_date })
}


router.get("/country", async (req, res) => {
    try {
        let countries = await Thoth_DB.get_data("SELECT * FROM country order by country_name ASC", {});
        res.send(countries);
    } catch (error) {
        serverError(error, res);
    }
})

// get country name
router.get("/country/:country_id", async (req, res) => {
    try {
        let country_id = req.params.country_id;
        let countries = await Thoth_DB.get_data("select country_name from country where country_id=:country_id", { country_id });
        if (countries.length == 0) return res.send("Undefined");
        res.send({ country_name: countries[0].country_name })
    } catch (error) {
        serverError(error, res);
    }
})

//insert_country();   
module.exports = router;
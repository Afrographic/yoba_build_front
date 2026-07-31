const axios = require("axios");
const { Consts } = require("../consts");

class Axios_Private {
    static async get_external_data(url) {
        let res = await axios.get(url);
        return res.data;
    }

    static async get_data(url) {
        let res = await axios.get(`${Consts.HOST}:${Consts.PORT}/api${url}`);
        return res.data;
    }

    static async get_secure_data(url, token) {
        let res = await axios.get(`${Consts.HOST}:${Consts.PORT}/api${url}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return res.data;
    }

    static async delete(url, token) {
        let res = await axios.delete(`${Consts.HOST}:${Consts.PORT}/api${url}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return res.data;
    }
}


module.exports = Axios_Private;
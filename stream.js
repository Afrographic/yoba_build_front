const express = require("express");
const jwt = require("jsonwebtoken");
const { Consts } = require("../consts");
const { Drive_Service } = require("../services/drive/drive");
const { serverError } = require("../utils/server_error");
const { Security } = require("../utils/security");
const router = express.Router();

router.get("/stream_file_secure/token/:token/file_id/:file_id", async (req, res) => {
    try {
        let token = req.params.token;
        let file_id = req.params.file_id;
        let stream = await Drive_Service.stream_file(file_id);
        stream.pipe(res);
    } catch (error) {
        serverError(error, res);
    }
})


router.get("/file_details/:file_id", Security.authenticateToken, async (req, res) => {
    try {
        let file_id = req.params.file_id;
        let file_details = await Drive_Service.get_file_details(file_id);
        res.send({
            name: file_details.name,
            size: parseInt(file_details.size)
        })
    } catch (error) {
        serverError(error, res);
    }
})


module.exports = router;
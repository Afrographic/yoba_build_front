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
const { Notification_Controller } = require("../controllers/notification_controller.js");

router.post("/become_agent",Security.authenticateToken,async(req,res)=>{
    try {
        let user_id = req.body.user_data.user_id;
        let domaine = req.body.domaine;
        let porte = req.body.porte;
        let created_at = new Date();
        if(req.files == undefined) return res.sendStatus(400);
        let insert = await DB.post_data("insert into nextbridge(created_at,user_id,domaine,porte) values(:created_at,:user_id,:domaine,:porte)",{created_at,user_id,domaine,porte});
        let nextbridge_id = insert[0];
        //Save documents
        for(const label in req.files){
            let titre = label.split("_").join(" ");
            let file = req.files[label];
            file.mv(`./public/backend_files/bd_${nextbridge_id}${HelperFunction.replace_space_with_underscore(file.name)}`);
            let url = `${Consts.backend_host}/backend_files/bd_${nextbridge_id}${HelperFunction.replace_space_with_underscore(file.name)}`;
            await DB.post_data("insert into nextbridge_docs(nextbridge_id,url,titre) values(:nextbridge_id,:url,:titre)",{nextbridge_id,url,titre})
        }
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})

router.get("/is_nextbridge_agent",Security.authenticateToken,async(req,res)=>{
    try {
        let user_id = req.body.user_data.user_id;
        let agents = await DB.get_data("select * from nextbridge where user_id=:user_id and active = 0",{user_id});
        res.send({is_agent:agents.length > 0})
    } catch (error) {
        serverError(error,res);
    }
})

router.get("/requettes_nextbrige",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let reqs = await DB.get_data("select * from nextbridge where active = 0 and rejected=0");
        for(let i = 0 ; i<=reqs.length-1;i++){
            reqs[i].user_info = await User_Controller.get_basic_info(reqs[i].user_id);
        }
        res.send(reqs);
    } catch (error) {
        serverError(error,res);
    }
})

router.post("/reject_nextbridge_agent/:nextbridge_id",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let nextbridge_id = parseInt(req.params.nextbridge_id);
        let message = req.body.message;
        let user_id = req.body.user_data.user_id;
        let user_data = await User_Controller.get_user_data(user_id);
        EmailService.send_email(user_data.user_email,"Agent NextBrige Rejete",message);
        Notification_Controller.new_notif(user_data.user_id,`Requette pour service NextBrige - \n${message}`);
        await DB.delete_data("delete from nextbridge where nextbridge_id=:nextbridge_id",{nextbridge_id});
         
        let docs = await DB.get_data("select * from nextbridge_docs where nextbridge_id=:nextbridge_id",{nextbridge_id});
        for(const doc of docs){
            HelperFile.deleteFileFromServer(doc.url);
        }
        await DB.delete_data("delete from nextbridge_docs where nextbridge_id=:nextbridge_id",{nextbridge_id});
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})

router.patch("/accept_nextbridge/:nextbridge_id",[Security.authenticateToken,Security.is_admin],async(req,res)=>{
    try {
        let nextbridge_id = parseInt(req.params.nextbridge_id);
        let grade = req.body.grade;
        await DB.update_data("update nextbridge set active = 1,grade=:grade where nextbridge_id=:nextbridge_id",{grade,nextbridge_id});
        //Notify user
        let user_id = req.body.user_data.user_id;
        let user_data = await User_Controller.get_user_data(user_id);
        let message = "Vous etes desormais un agent NextBridge sur BestDeal";
        EmailService.send_email(user_data.user_email,"Agent NextBridge valide",message);
        Notification_Controller.new_notif(user_data.user_id,message)
        res.sendStatus(200);
    } catch (error) {
        serverError(error,res);
    }
})

//Recuperer les agents
router.get("/nextbridge_agents",Security.authenticateToken,async(req,res)=>{
    try {
        let agents = await DB.get_data("select * from nextbridge where active = 1");
        for(let i = 0 ; i<=agents.length-1;i++){
            agents[i].user_info = await User_Controller.get_basic_info(agents[i].user_id)
        }
        res.send(agents)
    } catch (error) {
        serverError(error,res);
    }
})


module.exports = router;
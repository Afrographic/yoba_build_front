const { HelperFile } = require("./helper_file");
const { HelperFunction } = require("./helper_function");


class Validator {

    static #validEmail(email) {
        return (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email));
    }

    static validateFilesInput(req, res) {
        if (req.files == undefined) {
            res.status(401).send({
                msg: "Please add a file!"
            })
            return false;
        }

        if (req.files != undefined) {
            if (req.files.file == undefined) {
                res.status(401).send({
                    msg: "The field file is required!"
                })
                return false;
            }

        }

        return true;
    }

    static #validateFilesInput_new(req) {
        if (req.files == undefined) {      
            return false;
        }
        if (req.files != undefined) {
            if (req.files.file == undefined) {
                return false;
            }

        }
        return true;
    }


    static #correctURL(url) {
        if (url == 'undefined') return false;
        var urlregex = new RegExp(
            "^(http|https|ftp)\://([a-zA-Z0-9\.\-]+(\:[a-zA-Z0-9\.&amp;%\$\-]+)*@)*((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9])|192.168.232.99|([a-zA-Z0-9\-]+\.)*[a-zA-Z0-9\-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*$");
        return urlregex.test(url);
    }

    static #valid_bio(user_bio) {
        return user_bio.length <= 100;
    }

    static #valid_sex(user_sex) {
        return user_sex === 'M' || user_sex === 'F';
    }
    static #valid_pseudo(user_username) {
        return user_username.length >= 3;
    }


    static validateFields(fields, res) {
        let errors = [];
        for (const key in fields) {
            let value = fields[key];
            value = value ?? "";

            if (value != undefined) {
                if (value.trim().length == 0) {
                    errors.push(`The ${HelperFunction.Ucase(key)} cannot be empty`);
                }
            }

            if (key.toLowerCase().includes("email")) {
                if (!this.#validEmail(value)) {
                    errors.push(`The Email is invalid`);
                }
            }
            if (key.toLowerCase().includes("url")) {
                if (!this.#correctURL(value)) {
                    errors.push(`The URL is invalid`);
                }
            }
            if (key.toLowerCase().includes("bio")) {
                if (!this.#valid_bio(value.trim())) {
                    errors.push(`The Bio is too long , must be less than 100 characters`);
                }
            }
            if (key.toLowerCase().includes("sex")) {
                if (!this.#valid_sex(value.trim())) {
                    errors.push(`The Sex must be one character long either  M or F`);
                }
            }
            if (key.toLowerCase().includes("pseudo")) {
                if (!this.#valid_pseudo(value.trim())) {
                    errors.push(`The pseudo must be at leat 3 characters`);
                }
            }
        }

        // check for password match if any
        if (fields["password"] != undefined && fields["confirm_password"] != undefined) {
            if (fields["password"] != fields["confirm_password"]) {
                errors.push(`The password doesn't match`);
            }
        }

        if (errors.length == 0) {
            return true;
        } else {
            console.log(errors);
            res.status(404).send({
                errors: errors
            })
            return false;
        }

    }

    static valid_image_upload(req) {
        let condition1 = Validator.#validateFilesInput_new(req);
        if (!condition1) return false;
        let condition2 = HelperFile.is_image(req.files.file);
        if (!condition2) return false;
        let condition3 = HelperFile.fileExceed10M(req.files.file);
        if (condition3) return false;
        return true;
    }

    static valid_file_upload(req) {
        let conditon1 = Validator.#validateFilesInput_new(req);
        if (!conditon1) return false;
        let condition2 = HelperFile.fileExceed1G0(req.files.file);
        if (condition2) return false;
        return true;
    }

    static valid_voice_upload(req) {
        let conditon1 = Validator.#validateFilesInput_new(req);
        if (!conditon1) return false;
        let condition2 = HelperFile.is_aac_file(req.files.file);
        if (!condition2) return false;
        let condition3 = HelperFile.fileExceed10M(req.files.file);
        if (condition3) return false;
        return true;
    }


}

module.exports.Validator = Validator;



const { Thoth_DB } = require("../thoth_db");
const uuid = require("uuid");
const { Security } = require("./security");
const fs = require("fs");


class HelperFunction {

    static async delete_db_file(root_folder, table_name, field_name, column_id, column_id_value) {
        let data = await Thoth_DB.get_data(`SELECT ${field_name} from ${table_name} where ${column_id}=${column_id_value}`);
        if (data.length == 0) return;
        let file_name = data[0][`${field_name}`];
        if (file_name.trim().length == 0) return;
        let file_path = `${root_folder}/${file_name}`;
        try {
            fs.unlinkSync(file_path);

        } catch (error) {
            console.log(error);
        }

    }

    static generate_unique_id_from_time() {
        let date = new Date();
        let year = date.getFullYear();
        let month = date.getMonth() + 1;
        let day = date.getDay();
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let seconds = date.getSeconds();
        let milliseconds = date.getMilliseconds();
        return `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;
    }


    static Ucase(str) {
        return (str.charAt(0).toUpperCase() + str.slice(1)).trim();
    }

    static removeUselessWhiteSpace(str) {
        return str.trim().replaceAll(/\s+/g, " ");
    }

    rand(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    static generate_activation_code() {
        return uuid.v1().toString().substring(0, 5).toUpperCase();
    }

    static async create_chat_instance() {
        let chat_created_date = new Date();
        let chat = await Thoth_DB.post_data("insert into chat(chat_created_date) values(:chat_created_date)", { chat_created_date });
        let chat_id = chat[0];
        return chat_id;
    }

    static async home_work_over(home_work_id) {
        let home_work = await Thoth_DB.get_data("select * from home_work where home_work_id=:home_work_id", { home_work_id });

        let current_date = new Date();
        let home_work_created_date = home_work[0].home_work_created_date;
        let home_work_duration_in_days = home_work[0].home_work_duration_in_days;
        let deadline_date = this.add_days(home_work_created_date, home_work_duration_in_days);
        let diff = deadline_date.getTime() - current_date.getTime();

        return diff < 0;
    }

    static add_days(date, days) {
        var result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    static add_hours(date, hours) {
        date.setHours(date.getHours() + hours);

        return date;
    }


    static get_elapsed_time(date_) {
        let date = new Date(date_);

        //  for some reason i must add 1h to the current to meet the current time
        // will investigate this futher once deployed!
        let current_date = new Date();
        current_date = this.add_hours(current_date, 1);

        let diff = current_date.getTime() - date.getTime();
        let diff_days_raw = diff / (1000 * 60 * 60 * 24);


        let diff_days = Math.floor(diff_days_raw);
        let diff_hours = Math.floor(diff_days_raw * 24);
        let diff_minutes = Math.floor(diff_days_raw * 24 * 60)
        let diff_seconds = Math.floor(diff_days_raw * 24 * 60 * 60)


        if (diff_days == 0) {
            if (diff_hours == 0) {
                if (diff_minutes == 0) {
                    return `${diff_seconds} s`;
                } else {
                    return `${diff_minutes} min`;
                }
            } else {

                return `${diff_hours} h`;
            }
        } else {
            if (diff_days > 30) {
                if (diff_days > 365) {
                    if (Math.floor(diff_days / 365) == 1) {
                        return `1 an`

                    }
                    return `${Math.floor(diff_days / 365)} ans`
                } else {
                    if (Math.floor(diff_days / 30) == 1) {
                        return `${Math.floor(diff_days / 30)} mois`

                    }

                    return `${Math.floor(diff_days / 30)} mois`
                }
            } else {
                return `${diff_days} Jours`;
            }
        }


    }

    static get_extension(file_name) {
        let file = file_name.split(".");
        return file[file.length - 1];
    }

    static get_file_name(file_name) {
        let file = file_name.split(".");
        return file[0];
    }

}



module.exports.HelperFunction = HelperFunction;
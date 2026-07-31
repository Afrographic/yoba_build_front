const uuid = require("uuid");
const fs = require("fs");
const compress_images = require("compress-images");
const { Consts } = require("../consts");
const sharp = require('sharp');
const crypto = require("crypto");
const { HelperFunction } = require("./helper_function");
const { Drive_Service } = require("../services/drive/drive");



class HelperFile {

    static generate_unique_id_from_time() {
        let date = new Date();
        let year = date.getFullYear();
        let month = date.getMonth() + 1;
        let day = date.getDay();
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let seconds = date.getSeconds();
        let milliseconds = date.getMilliseconds();
        return `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`
    }

    static compressImage(source, destination) {
        let full_source = `public/${source}/*.{jpg,JPG,jpeg,JPEG,png,svg,gif}`;
        let full_destination = `public/${destination}/`;
        compress_images(
            full_source,
            full_destination, { compress_force: false, statistic: true, autoupdate: true },
            false, { jpg: { engine: "mozjpeg", command: ["-quality", "60"] } }, { png: { engine: "pngquant", command: ["--quality=20-50", "-o"] } }, { svg: { engine: "svgo", command: "--multipass" } }, {
            gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] },
        },
            function (err, completed) {
                if (completed === true) {
                    HelperFile.clear_files_from_directory(source);
                }
            }
        );
    }

    static clear_files_from_directory(directory_path) {
        let inputPath = `public/${directory_path}/`;
        fs.readdir(inputPath, (err, files) => {
            if (files.length > 0) {
                files.forEach((file) => {
                    fs.unlinkSync(inputPath + file);
                });
            }
        });
    }

    static fileExceed10M(file) {
        return file.size > 10000000;
    }

    static isMp4Video(file) {
        let extension = this.getExtension(file.name);
        return extension == "mp4";
    }

    static is_image(file) {
        let extension = this.getExtension(file.name);
        extension = extension.toLowerCase();
        return extension == 'jpeg' || extension == 'jpg' || extension == 'png' || extension == 'svg' || extension == 'gif' || extension == 'webp'
    }

    static fileExceed1G0(file) {
        return file.size > 1000000000;
    }
    static fileExceed30M(file) {
        return file.size > 30000000;
    }

    static uploadFile(serverPath, file) {
        let uid = this.generate_unique_id_from_time();
        let nameFile = `${this.replace_space_with_underscore(file.name.split(".")[0].substring(0, 100))}_${uid}.${this.getExtension(file.name)}`;
        file.mv(`./public/${serverPath}/${nameFile}`);
        return `${Consts.HOST}:${Consts.PORT}/${serverPath}/${nameFile}`;
    }

    static replace_space_with_underscore(str) {
        str = str.trim().replaceAll(/\s+/g, "_");
        return str.trim().replaceAll(/\/+/g, "_");
    }

    static deleteFileFromServer(fileURL) {
        let folderpath = this.getFileFolderFromURL(fileURL);
        fs.unlink(folderpath, (err) => {
            if (err) {
                console.error(err);
                return 1;
            }
        });
    }
    static delete_file_from_server(fileURL) {
        Drive_Service.delete_file(fileURL);
    }

    static getFileFolderFromURL(url) {
        if (url == undefined) return "";
        url = url.split("//");
        url = url[1];
        url = url.split("/");
        url.shift();
        url.unshift("public")
        url = url.join("/");
        return url;
    }

    static getExtension(url) {
        url = url.split(".");
        return (url[url.length - 1]).toLowerCase();
    }

    static is_aac_file(file) {
        let extension = this.getExtension(file.name);
        return extension == "aac";
    }


    static uid() {
        return crypto.randomUUID().substring(0, 9);
    }

    static upload_file(file) {
        let nameFile = `${this.replace_space_with_underscore(file.name.split(".")[0].substring(0, 100))}_${this.uid()}${HelperFunction.generate_unique_id_from_time()}.${this.getExtension(file.name)}`;
        file.mv(`./private/${nameFile}`);
        return nameFile;
    }

    static upload_image(file) {
        console.log(file);
        let nameFile = `${this.replace_space_with_underscore(file.name.split(".")[0].substring(0, 100))}_${this.uid()}${HelperFunction.generate_unique_id_from_time()}.${this.getExtension(file.name)}`;
        file.mv(`./private/${nameFile}`, (err) => {
            if (err) {
                console.log(err);
                return;
            }

            this.generate_thumbnail(nameFile, `./private/${nameFile}`)
        });

        return {
            name_file: nameFile
        };

    }

    static generate_thumbnail(file_name, image_path) {
        sharp(image_path)
            .resize(50)
            .png({ progressive: true, quality: 10 })
            .toFile(`./private/thumbnails/${file_name}`)
            .then(data => {
                console.log("Thumbnail generated!");
            })
            .catch(err => { console.log(err) });
    }

    static delete_file(file_name) {
        let url = `private/${file_name}`;
        fs.unlinkSync(url);
    }

}



module.exports.HelperFile = HelperFile;
const pup = require("puppeteer");
const uuid = require("uuid");

const { HelperFunction } = require("../utils/helper_function");
const { Thoth_DB } = require("../thoth_db");


function print(str) {
    console.log(str);
}

class WebScrapper {
    static async getWEbsiteInfo() {
        const browser = await pup.launch({ "headless": true });
        const page = await browser.newPage();
        await page.goto("https://www.youtube.com/watch?v=DnN-mA3r3HE&ab_channel=Grafikart.fr");
        await page.screenshot({ path: `./app/linkPreview${uuid.v1().toString()}.png` });
        // // const websiteDescription = await page.$eval("meta[name='description']", el => el.getAttribute("content"));
        // const websiteIconLink = await page.$eval("link[rel='icon'],link[rel='shortcut icon']", el => el.getAttribute("href"));
        // // console.log(websiteDescription);
        // console.log(websiteIconLink);

        await browser.close();
    }

    static async getWEbsitePreview(url) {

        try {
            let urlToReturn = "";
            // check if the link is already preview or not
            let res = await Thoth_DB.get_data("select * from urlpreviewcache where url=:url", { url });

            print(res.length);
            if (res.length == 0) {

                // previewing the url
                const browser = await pup.launch({ "headless": true });
                const page = await browser.newPage();
                const file_name = HelperFunction.generate_unique_id_from_time();
                await page.goto(url);
                await page.screenshot({ path: `./public/images/website_preview/${file_name}.png` });
                await browser.close();

                // Inserting to the database
                urlToReturn = `http://192.168.10.99:3000/images/website_preview/${file_name}.png`;

                await Thoth_DB.post_data("insert into urlpreviewcache(preview,url) values(:preview,:url)", {
                    urlToReturn, url
                })


            } else {
                urlToReturn = res[0].preview
            }

            return urlToReturn;

        } catch (error) {
            console.log(error);
        }

    }
}

module.exports = { WebScrapper };
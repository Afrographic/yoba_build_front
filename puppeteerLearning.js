const pup = require("puppeteer");
const fs = require("fs").promises;

async function start() {
    const browser = await pup.launch({ "headless": false });
    const page = await browser.newPage();
    await page.goto("https://learnwebcode.github.io/practice-requests/");

    const names = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".info strong")).map(x => x.textContent);
    })
    await fs.writeFile("./app/name.txt", names.join("\r\n"));
    // await page.screenshot({ path: "./app/coder.png", fullPage: true });
    // const photos = await page.$$eval("img",(imgs)=>{
    //     return imgs.map(x=>x.src);
    // })
    
    // for(const photo of photos){
    //     const imagePage = await page.goto(photo);
    //     await fs.writeFile(`public/images/${photo.split("/").pop()}`,await imagePage.buffer())
    // }
  
    await page.click("#clickme");
    const clickedData = await page.$eval("#data",el=>el.textContent);
    console.log(clickedData);

    await page.type("#ourfield","blue");
    await Promise.all([
        page.click("#ourform > button"),
        page.waitForNavigation()
    ])
    const info = await page.$eval("#message",x=>x.textContent);
    console.log(info);

   

    await browser.close();
}

// start();

//setInterval(start,5000);
const got = require('got');
const cheerio = require('cheerio');
function print(str){
    console.log(str);
}

const url = 'https://www.vgmusic.com/music/console/nintendo/nes';

const isMidi = (i, link) => {
    // renvoie false si l'attribut href n'est pas présent
    if(typeof link.attribs.href === 'undefined') { return false }
   
    return link.attribs.href.includes('.mid');
  };
   
  const noParens = (i, link) => {
    // Expression régulière qui détermine si le texte comporte des parenthèses
    const parensRegex = /^((?!\().)*$/;
    return parensRegex.test(link.children[0].data);
  };

function scrapper() {
    (async () => {
        print("Loading...")
        const response = await got(url);
        const $ = cheerio.load(response.body);

        print("End loading");
        // Créée un tableau à partir des éléments HTML pour les filtrer
        $('a').filter(isMidi).filter(noParens).each((i, link) => {
            const href = link.attribs.href;
            console.log(href);
          });
    })();
}


module.exports = scrapper;
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const pageLoader = require("../utils/pageLoader");

main().catch((e) => console.error(e));

async function main() {
  const url = "https://www.fragrantica.com/notes";
  const html = await pageLoader.getHtmlOfPage(
    url,
    `.notebox img[alt~="Vanillin"]`
  );

  const htmlFileToSave =
    __dirname +
    "/../storage/html/" +
    __filename.replace(/^.*[\\\/]/, "").replace(".js", ".html");
  fs.writeFileSync(htmlFileToSave, html);

  const $ = cheerio.load(html);
  const categoriesAndNotes = $(".cell.gone4empty h2, .cell.notebox a");
  let currentCategory = "<UNKNOWN CATEGORY>";
  const notes = [];

  for (let i = 0; i < categoriesAndNotes.length; i++) {
    const el = categoriesAndNotes[i];
    const elText = $(el).text().replace(/\n/g, "").trim();
    if (el.name === "h2") {
      currentCategory = elText;
      continue;
    }

    notes.push({
      category: currentCategory,
      name: elText,
      href: $(el).attr("href"),
      img: $(el).find("img").attr("src"),
    });
  }

  const fileToSave =
    __dirname +
    "/../storage/json/" +
    __filename.replace(/^.*[\\\/]/, "").replace(".js", ".json");
  fs.writeFileSync(fileToSave, JSON.stringify(notes, null, 2));
}

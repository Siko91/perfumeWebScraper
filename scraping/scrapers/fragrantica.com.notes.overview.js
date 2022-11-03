const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const pageLoader = require("../utils/pageLoader");
const { parseHTML } = require("cheerio");

const HTML_FILE_PATH =
  __dirname + "/../storage/html/fragrantica.com.notes.overview.html";
const JSON_FILE_PATH =
  __dirname + "/../storage/json/fragrantica.com.notes.overview.json";

main().catch((e) => console.error(e));

async function main() {
  // await storeHtml();
  await parseHtml();
  console.log("DONE!")
}

async function storeHtml() {
  const url = "https://www.fragrantica.com/notes";
  const html = await pageLoader.getHtmlOfPage(
    url,
    `.notebox img[alt~="Vanillin"]`
  );
  fs.writeFileSync(HTML_FILE_PATH, html);
}

async function parseHtml() {
  const $ = cheerio.load(fs.readFileSync(HTML_FILE_PATH).toString());
  const categoriesAndNotes = $(".cell.gone4empty h2, .cell.notebox a");
  let currentCategory = "<UNKNOWN CATEGORY>";
  const notes = {};

  for (let i = 0; i < categoriesAndNotes.length; i++) {
    const el = categoriesAndNotes[i];
    const elText = $(el).text().replace(/\n/g, "").trim();
    if (el.name === "h2") {
      currentCategory = elText;
      continue;
    }

    const href = $(el).attr("href");
    const img = $(el).find("img").attr("src");
    const id = href
      .match(/-[0-9]+\.html/)
      .toString()
      .replace(".html", "")
      .substring(1);
    notes[id] = {
      category: currentCategory,
      name: elText,
      href,
      img,
      id,
    };
  }

  const notesArray = Object.keys(notes).map((id) => notes[id]);

  fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(notesArray, null, 2));

  console.log(`DONE - saved ${notesArray.length} notes`);
}

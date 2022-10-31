const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const pageLoader = require("../utils/pageLoader");

let knownNotes = require("../storage/json/fragrantica.com.notes.overview.json");
knownNotes = [knownNotes[0], knownNotes[1], knownNotes[2]]; // fewer requests while coding

const HTML_FILE_PATHS = knownNotes.map(
  (note) => __dirname + "/../storage/html/notes/" + note.name + ".html"
);
const JSON_FILE_PATHS = knownNotes.map(
  (note) => __dirname + "/../storage/json/notes/" + note.name + ".json"
);

main().catch((e) => console.error(e));

async function main() {
  await storeHtml();
  await parseHtml();
}

async function storeHtml() {
  await pageLoader.getHtmlOfPages(
    ".prefumeHbox",
    knownNotes.map((i) => i.href),
    (html, i, url) => {
      fs.writeFileSync(HTML_FILE_PATHS[i], html);
    }
  );
}

async function parseHtml() {
  for (let i = 0; i < knownNotes.length; i++) {
    const note = knownNotes[i];
    const html = fs.readFileSync(HTML_FILE_PATHS[i]);
    const $ = cheerio.load(html);

    // TODO: Parse html files

    fs.writeFileSync(JSON_FILE_PATHS[i], "{}");
  }
}

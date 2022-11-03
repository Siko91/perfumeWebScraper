const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const pageLoader = require("../utils/pageLoader");

let knownNotes = require("../storage/json/fragrantica.com.notes.overview.json");

function toFileName(name) {
  return name.replace(/[^a-zA-Z0-9 -]/g, "_");
}

const HTML_FILE_PATHS = knownNotes.map(
  (note) =>
    __dirname +
    "/../storage/html/fragrantica.com.notes/" +
    toFileName(note.name) +
    ".html"
);
const JSON_FILE_PATHS = knownNotes.map(
  (note) =>
    __dirname +
    "/../storage/json/fragrantica.com.notes/" +
    toFileName(note.name) +
    ".json"
);

main().catch((e) => console.error(e));

async function main() {
  await storeHtml();
  // await parseHtml();
}

async function storeHtml() {
  const notesLeft = knownNotes
    .map((note, index) => {
      return { note, index, htmlPath: HTML_FILE_PATHS[index] };
    })
    .filter((el) => !fs.existsSync(el.htmlPath));

  await pageLoader.getHtmlOfPages(
    ".prefumeHbox",
    notesLeft.map((i) => i.note.href),
    async (html, i, url) => {
      fs.writeFileSync(notesLeft[i].htmlPath, html);
      console.log(`[${new Date().toISOString()}] Saved #${notesLeft[i].index} ` + notesLeft[i].htmlPath);
      return new Promise((resolve) => setTimeout(() => resolve(), 5 * 1000)); // wait XX seconds
    },
    1
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

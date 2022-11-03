const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const pageLoader = require("../utils/pageLoader");

let knownPerfumes = require("../storage/json/fragrantica.com.perfumes.overview.json");

function toFileName(name) {
  return name.replace(/[^a-zA-Z0-9 -]/g, "_");
}

const HTML_FILE_PATHS = knownPerfumes.map(
  (perfume) =>
    __dirname +
    "/../storage/html/fragrantica.com.perfumes/" +
    toFileName(perfume.name) +
    ".html"
);
const JSON_FILE_PATHS = knownPerfumes.map(
  (perfume) =>
    __dirname +
    "/../storage/json/fragrantica.com.perfumes/" +
    toFileName(perfume.name) +
    ".json"
);

main().catch((e) => console.error(e));

async function main() {
  await storeHtml();
  // await parseHtml();
  console.log("DONE!")
}

async function storeHtml() {
  const pagesLeft = knownPerfumes
    .map((perfume, index) => {
      return { perfume, index, htmlPath: HTML_FILE_PATHS[index] };
    })
    .filter((el) => !fs.existsSync(el.htmlPath));

  await pageLoader.getHtmlOfPages(
    "#perfumegraph",
    pagesLeft.map((i) => i.perfume.href),
    async (html, i, url) => {
      fs.writeFileSync(pagesLeft[i].htmlPath, html);
      console.log(`[${new Date().toISOString()}] Saved #${pagesLeft[i].index} ` + pagesLeft[i].htmlPath);
      return new Promise((resolve) => setTimeout(() => resolve(), 1 * 1000)); // wait XX seconds
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

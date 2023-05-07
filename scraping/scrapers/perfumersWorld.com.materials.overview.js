const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const pageLoader = require("../utils/pageLoader");
const { parseHTML } = require("cheerio");
const { downloadFile } = require("../utils/downloader");

const HTML_FILE_PATH =
  __dirname + "/../storage/html/perfumersWorld.com.materials.overview.html";
const JSON_FILE_PATH =
  __dirname + "/../storage/json/perfumersWorld.com.materials.overview.json";

main().catch((e) => console.error(e));

async function main() {
  // await storeHtml();
  await parseHtml();
  console.log("DONE!");
}

async function storeHtml() {
  const url = "https://www.perfumersworld.com/perfume-supplies.php";
  await downloadFile(url, HTML_FILE_PATH);
}

async function parseHtml() {
  const $ = cheerio.load(fs.readFileSync(HTML_FILE_PATH).toString());
  const rows = $("table#tblMain tbody tr");
  const parsedMaterials = [];

  for (let r = 0; r < rows.length; r++) {
    const row = $(rows[r]);
    const [td1, td2] = row.find("td").map((i, el) => $(el));

    const [nameLink, priceLink] = td1.find("a").map((i, el) => $(el));
    const name = nameLink.text();
    const url = "https://www.perfumersworld.com/" + nameLink.attr("href");
    const [id, priceLinkString] = priceLink
      .text()
      .split("@")
      .map((t) => t.trim());
    const [priceStr, unit] = priceLinkString?.split("$")[1].split("/") || ["NaN","?"];
    const price = parseFloat(priceStr);
    const defaul_quantity = parseFloat(td2.find('form input[name~="product_qty"]').val());

    parsedMaterials.push({ name, url, id, unit, price, defaul_quantity });
  }

  fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(parsedMaterials, null, 2));

  console.log(`DONE - saved ${parsedMaterials.length} materials`);
}

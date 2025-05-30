/* eslint-disable react-hooks/rules-of-hooks */
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const pageLoader = require("../utils/pageLoader");
const Db = require("../utils/db");

const groups = [
  // Primary
  "amber",
  "aromatic",
  "chypre",
  "citrus",
  "floral",
  "leather",
  "woody",
  // secondary
  "amber+floral",
  "amber+fougere",
  "amber+spicy",
  "amber+vanilla",
  "amber+woody",
  "aromatic+aquatic",
  "aromatic+fougere",
  "aromatic+fruity",
  "aromatic+green",
  "aromatic+spicy",
  "chypre+floral",
  "chypre+fruity",
  "citrus+aromatic",
  "citrus+gourmand",
  "floral+aldehyde",
  "floral+aquatic",
  "floral+fruity",
  "floral+fruity+gourmand",
  "floral+green",
  "floral+woody+musk",
  "woody+aquatic",
  "woody+aromatic",
  "woody+chypre",
  "woody+floral+musk",
  "woody+spicy",
];

const URLS = groups.map(
  (group) => `https://www.fragrantica.com/groups/${group}.html`
);

const DB_HTML =
  __dirname + "/../storage/db/fragrantica.com.perfume.groups.raw.unqlite";

const JSON_FILE_PATH =
  __dirname + "/../storage/json/fragrantica.com.perfumes.overview.json";

main().catch((e) => console.error(e));

async function main() {
  // await moveHtmlFilesToDb();
  await storeHtml();
  await parseHtml();
  console.log("DONE!");
}

async function moveHtmlFilesToDb() {
  await Db.moveHtmlFilesToDb(
    DB_HTML,
    groups
      .map((group) => group.replace(/\+/g, "-"))
      .map(
        (group) =>
          __dirname +
          `/../storage/html/fragrantica.com.groups/fragrantica.com.perfumes.groups.${group}.overview.html`
      ),
    groups
  );
}

async function storeHtml() {
  await Db.useLevelDb(DB_HTML, async (db) => {
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const url = URLS[i];
      if (await db.exists(group)) continue;

      await pageLoader.getHtmlOfPages(
        ".prefumeHbox",
        [url],
        async (html) => {
          console.log(`> saving group #${i} (${groups[i]})`);
          await db.put(group, html);
        },
        1
      );
    }
  });
}

async function parseHtml() {
  await Db.useLevelDb(DB_HTML, async (db) => {
    const allPerfumes = {};

    for (let i = 0; i < groups.length; i++) {
      const html = await db.get(groups[i]).then((i) => i.toString());
      const $ = cheerio.load(html);
      const things = $(".prefumeHbox, .grid-x > .cell.text-center");

      let currentSubCategory = "<UNKNOWN SUB CATEGORY>";
      for (let i = 0; i < things.length; i++) {
        const el = things[i];
        const subGroupTitleChildren = $(el).children("h3").children("a");
        if (subGroupTitleChildren.length) {
          currentSubCategory = $(el).children("h3").children("a").text().trim();
          perfumeCountInSubCategory = $(el)
            .find("h3 > small > a")
            .text()
            .trim();
          continue;
        }

        const name = $(el).find("h3").text().replace(/\n/g, "").trim();
        const href =
          "https://www.fragrantica.com" + $(el).find("h3 a").attr("href");
        const imgSmall = $(el).find(".hide-for-medium img").attr("src");
        const imgBig = $(el).find(".show-for-medium img").attr("src");
        const comments = $(el).find("span svg").parent().text().trim() || "0";
        const [targetUsers, year] = $(el)
          .find("div:nth-of-type(2) span:nth-of-type(2)")
          .parent()
          .text()
          .trim()
          .replace(/\n/g, " ")
          .split(" ")
          .filter((i) => i)
          .map((i) => i.trim());

        const id = href
          .match(/-[0-9]+\.html/)
          .toString()
          .replace(".html", "")
          .substring(1);

        allPerfumes[id] = {
          id,
          name,
          href,
          imgSmall,
          imgBig,
          targetUsers,
          year,
          comments,
          subCategory: currentSubCategory,
          subCategorySize: perfumeCountInSubCategory,
        };
      }
    }

    const perfumeArray = Object.keys(allPerfumes).map((id) => allPerfumes[id]);
    fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(perfumeArray, null, 2));

    console.log(`DONE - saved ${perfumeArray.length} perfumes`);
  });
}

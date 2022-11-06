/* eslint-disable react-hooks/rules-of-hooks */
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const pageLoader = require("../utils/pageLoader");

let knownNotes = require("../storage/json/fragrantica.com.notes.overview.json");
const Db = require("../utils/db");

function toFileName(name) {
  return name.replace(/[^a-zA-Z0-9 -]/g, "_");
}

const DB_HTML = __dirname + "/../storage/db/fragrantica.com.notes.raw.unqlite";

const DB_PARSED = __dirname + "/../storage/db/fragrantica.com.notes.unqlite";

main().catch((e) => console.error(e));

async function main() {
  await moveHtmlFilesToDb();
  await storeHtml();
  // await parseHtml();
  console.log("DONE!");
}

async function moveHtmlFilesToDb() {
  await Db.moveHtmlFilesToDb(
    DB_HTML,
    knownNotes.map(
      (note) =>
        __dirname +
        "/../storage/html/fragrantica.com.notes/" +
        toFileName(note.name) +
        ".html"
    ),
    knownNotes.map((note) => note.id)
  );
}

async function storeHtml() {
  await Db.useLevelDb(DB_HTML, async (db) => {
    for (let i = 0; i < knownNotes.length; i++) {
      const note = knownNotes[i];
      if (await db.exists(note.id)) continue;

      await pageLoader.getHtmlOfPages(
        ".prefumeHbox, .latest-list",
        [note.href],
        async (html, i, url) => {
          db.put(note.id, html);
          console.log(
            `[${new Date().toISOString()}] Saved #${note.id} ` + note.name
          );
          return new Promise((resolve) =>
            setTimeout(() => resolve(), 1 * 1000)
          ); // wait XX seconds
        },
        1
      );
    }
  });
}

async function parseHtml() {
  await Db.useLevelDb(DB_HTML, async (dbHtml) => {
    await Db.useLevelDb(DB_PARSED, async (dbParsed) => {
      for (let i = 0; i < knownNotes.length; i++) {
        const note = knownNotes[i];
        const html = await dbHtml.get(note.id).then((i) => i.toString());
        const $ = cheerio.load(html);

        // TODO: Parse html files

        dbParsed.put(note.id, "{}");
      }
    });
  });
}

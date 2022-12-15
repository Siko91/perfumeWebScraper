/* eslint-disable react-hooks/rules-of-hooks */
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const pageLoader = require("../utils/pageLoader");

let knownNotes = require("../storage/json/fragrantica.com.notes.overview.json");
let knownPerfumes = require("../storage/json/fragrantica.com.perfumes.overview.json");

const Db = require("../utils/db");

function toFileName(name) {
  return name.replace(/[^a-zA-Z0-9 -]/g, "_");
}

const ACCORD_COMBO_SIZE = 4;

const JSON_COMMON_ACCORD_COMBOS =
  __dirname +
  "/../storage/json/fragrantica.com.perfumes.common.accords.of." +
  ACCORD_COMBO_SIZE +
  ".json";

const DB_PARSED = __dirname + "/../storage/db/fragrantica.com.perfumes.unqlite";

main().catch((e) => console.error(e));

async function main() {
  await countComboUsage(ACCORD_COMBO_SIZE);
  console.log("DONE!");
}

async function countComboUsage(comboSize) {
  const combos = {};
  await Db.useLevelDb(DB_PARSED, async (db) => {
    for (let i = 0; i < knownPerfumes.length; i++) {
      const perfume = knownPerfumes[i];
      console.log(`Processing perfume #${perfume.id} ${perfume.name}`);
      if (!(await db.exists(perfume.id))) continue;
      const parsedPerfume = JSON.parse(await db.get(perfume.id));

      const currentCombos = getCombos(parsedPerfume.allNotes, comboSize);
      for (let c = 0; c < currentCombos.length; c++) {
        const comboKey = currentCombos[c];
        combos[comboKey] = (combos[comboKey] || 0) + 1;
      }
    }
  });

  const knownNotesById = {};
  for (let i = 0; i < knownNotes.length; i++) {
    knownNotesById[knownNotes[i].id] = knownNotes[i].name;
  }

  const sortedCombosArray = Object.keys(combos)
    .map((comboKey) => {
      const noteIds = comboKey.split(",");
      return {
        count: combos[comboKey],
        noteIds,
        notes: noteIds.map((i) => knownNotesById[i]),
      };
    })
    .filter((i) => i.count > 10)
    .sort((a, b) => b.count - a.count);

  console.log(`Saving ${sortedCombosArray.length} accordCombinations`);
  fs.appendFileSync(JSON_COMMON_ACCORD_COMBOS, "[\n");
  sortedCombosArray.forEach((obj, i, arr) => {
    if (i < arr.length - 1) {
      fs.appendFileSync(
        JSON_COMMON_ACCORD_COMBOS,
        `  ${JSON.stringify(obj)},\n`
      );
    } else {
      fs.appendFileSync(JSON_COMMON_ACCORD_COMBOS, `  ${JSON.stringify(obj)}`);
    }

    if (i % 10000 === 0) {
      console.log(`Wrote ${i}/${arr.length} lines`);
    }
  });
  fs.appendFileSync(JSON_COMMON_ACCORD_COMBOS, `\n]`);
}

function getCombos(listOfIds, comboSize) {
  listOfIds = listOfIds.sort();
  const combos = [];
  makeCombinationsUtil(listOfIds.length, comboSize, (indexes) => {
    combos.push(indexes.map((i) => listOfIds[i]).join(","));
  });
  return combos;
}

let ans = [];
let tmp = [];
function makeCombinationsUtil(n, k, onAnswer, left = 0) {
  // Pushing this vector to a vector of vector
  if (k == 0) {
    ans.push(tmp);
    onAnswer([...tmp]);
    return;
  }
  // i iterates from left to n. First time // left will be 1
  for (let i = left; i < n; ++i) {
    tmp.push(i);
    makeCombinationsUtil(n, k - 1, onAnswer, i + 1);
    // Popping out last inserted element // from the vector
    tmp.pop();
  }
}

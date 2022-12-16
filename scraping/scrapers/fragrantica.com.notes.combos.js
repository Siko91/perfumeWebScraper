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

const ACCORD_COMBO_SIZE = 5;
const LIMIT_COMBOS_BY_TAKING_ONLY_1_FROM_EACH_N = 1

let POSITION_TO_TAKE_WHEN_LIMITING_COMBOS = 0;

const GET_JSON_COMMON_ACCORD_COMBOS = () =>
  __dirname +
  "/../storage/json/fragrantica.com.perfumes.common.accords.of." +
  ACCORD_COMBO_SIZE +
  ".part." +
  (POSITION_TO_TAKE_WHEN_LIMITING_COMBOS + 1) +
  ".json";

const DB_PARSED = __dirname + "/../storage/db/fragrantica.com.perfumes.unqlite";


main().catch((e) => console.error(e));

async function main() {
  for (let i = POSITION_TO_TAKE_WHEN_LIMITING_COMBOS; i < LIMIT_COMBOS_BY_TAKING_ONLY_1_FROM_EACH_N; i++) {
    POSITION_TO_TAKE_WHEN_LIMITING_COMBOS = i
    await countComboUsage(ACCORD_COMBO_SIZE);
    console.log("DONE!");
  }
}

async function countComboUsage(comboSize) {
  const comboGroups = {};

  await Db.useLevelDb(DB_PARSED, async (db) => {
    for (let i = 0; i < knownPerfumes.length; i++) {
      const perfume = knownPerfumes[i];

      if (!(await db.exists(perfume.id))) continue;
      const parsedPerfume = JSON.parse(await db.get(perfume.id));

      if (comboSize >= 5) {
        const needsCleanup = (i > 0 && i % 2500 === 0)

        if (i > 0 && i % 10000 === 0) {
          console.log("Removing rare combos to make space for common ones");
          let allCounter = 0;
          let deletedCounter = 0;
          for (const g in comboGroups) {
            const group = comboGroups[g];
            for (const comboKey in group) {
              allCounter++;
              if (group[comboKey] <= 3) {
                delete group[comboKey]
                deletedCounter++;
              }
            }
          }
          console.log(`Done cleaning up. Removed ${deletedCounter} out of ${allCounter} combos`)
        }
      }

      if (comboSize >= 5) {
        if (parsedPerfume.allNotes.length > 30) { continue; }
      }

      if (i > 0 && i % 500 === 0)
        console.log(`Processing perfume #${perfume.id}`);

      addCombosFromNotes(parsedPerfume.allNotes, comboSize, comboGroups);
    }
  });

  const knownNotesById = {};
  for (let i = 0; i < knownNotes.length; i++) {
    knownNotesById[knownNotes[i].id] = knownNotes[i].name;
  }


  let allCombosByCount = {}

  const comboGroupNames = Object.keys(comboGroups)
  for (let i = 0; i < comboGroupNames.length; i++) {
    const group = comboGroups[comboGroupNames[i]]
    const comboKeys = Object.keys(group);
    console.log(`Processing ${comboKeys.length} combos...`)

    for (let c = 0; c < comboKeys.length; c++) {
      const comboKey = comboKeys[c];

      if (group[comboKey] < 5) continue;
      if (comboSize >= 5 && group[comboKey] < 10) continue;

      const noteIds = comboKey.split(",");
      const obj = {
        count: parseInt(group[comboKey]),
        noteIds,
        notes: noteIds.map((i) => knownNotesById[i]),
      };

      allCombosByCount[obj.count] = allCombosByCount[obj.count] || [];
      allCombosByCount[obj.count].push(obj)
    }

    console.log(`Processing combos ${parseInt(i/comboGroupNames.length * 100)}% (${allCombosByCount.length} combos processed`)
    delete comboGroups[comboGroupNames[i]];
  }

  console.log(`Saving ${allCombosByCount.length} accordCombinations`);
  const JSON_COMMON_ACCORD_COMBOS = GET_JSON_COMMON_ACCORD_COMBOS()
  fs.writeFileSync(JSON_COMMON_ACCORD_COMBOS, "");
  fs.appendFileSync(JSON_COMMON_ACCORD_COMBOS, "[\n");

  const allCounts = Object.keys(allCombosByCount).sort((a, b) => b - a);
  let counter = 0;
  for (const count of allCounts) {
    for (let l = 0; l < allCombosByCount[count].length; l++) {
      counter ++
      if (i < arr.length - 1) {
        fs.appendFileSync(
          JSON_COMMON_ACCORD_COMBOS,
          `  ${JSON.stringify(allCombosByCount[count][l])},\n`
        );
      } else {
        fs.appendFileSync(JSON_COMMON_ACCORD_COMBOS, `  ${JSON.stringify(allCombosByCount[count][l])}`);
      }
    }

    if (counter > 0 && counter % 10000 === 0) {
      console.log(`Wrote ${i}/${arr.length} lines`);
    }

    delete allCombosByCount[count]
  }

  fs.appendFileSync(JSON_COMMON_ACCORD_COMBOS, `\n]`);
}

function addCombosFromNotes(listOfIds, comboSize, comboGroups) {
  listOfIds = listOfIds.sort();
  makeCombinationsUtil(listOfIds.length, comboSize, (indexes) => {
    const comboKeyParts = indexes.map((i) => listOfIds[i]);
    const comboKey = comboKeyParts.join(",")

    const skip = comboKeyParts[0] % LIMIT_COMBOS_BY_TAKING_ONLY_1_FROM_EACH_N !== POSITION_TO_TAKE_WHEN_LIMITING_COMBOS
    if (skip) return;

    const groupName = comboKeyParts[0] + "," + comboKeyParts[comboKeyParts.length - 1]
    comboGroups[groupName] = comboGroups[groupName] || {};
    comboGroups[groupName][comboKey] = (comboGroups[groupName][comboKey] || 0) + 1;
  });
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

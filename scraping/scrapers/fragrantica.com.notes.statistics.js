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

const DB_PARSED_PERFUMES =
  __dirname + "/../storage/db/fragrantica.com.perfumes.unqlite";
const JSON_NOTE_STATS_DIR =
  __dirname + "/../storage/json/fragrantica.com.notes.statistics";

main().catch((e) => console.error(e));

async function main() {
  await calculate();
  console.log("DONE!");
}

async function calculate() {
  const noteStatsObject = {};
  for (let i = 0; i < knownNotes.length; i++) {
    const note = knownNotes[i];
    noteStatsObject[note.id] = {
      ...note,
      usedAs: {
        any: 0,
        top: 0,
        mid: 0,
        base: 0,
        unknown: 0,
      },
      usedWith: {
        // note_id: used_count,
      },
      usedFor: {
        // accordName: { sum: sum_of_accord_values count: used_count },
      },
      avgPerfumeRating: { sum: 0, count: 0 },
      avgPerfumeLongevity: { sum: 0, count: 0 },
      avgPerfumeStrength: { sum: 0, count: 0 },
    };
  }

  await Db.useLevelDb(DB_PARSED_PERFUMES, async (db) => {
    for (let i = 0; i < knownPerfumes.length; i++) {
      const perfume = knownPerfumes[i];
      if (!(await db.exists(perfume.id))) continue;
      const parsedPerfume = JSON.parse(await db.get(perfume.id));
      console.log(`Reading note stats from ${perfume.id} ${perfume.name}`);
      readNoteStatisticsFromPerfume(parsedPerfume, noteStatsObject);
    }
  });

  for (let i = 0; i < knownNotes.length; i++) {
    const id = knownNotes[i].id;
    noteStatsObject[id].avgPerfumeRating =
      noteStatsObject[id].avgPerfumeRating.count === 0
        ? 0
        : noteStatsObject[id].avgPerfumeRating.sum /
          noteStatsObject[id].avgPerfumeRating.count;

    noteStatsObject[id].avgPerfumeLongevity =
      noteStatsObject[id].avgPerfumeLongevity.count === 0
        ? 0
        : noteStatsObject[id].avgPerfumeLongevity.sum /
          noteStatsObject[id].avgPerfumeLongevity.count;

    noteStatsObject[id].avgPerfumeStrength =
      noteStatsObject[id].avgPerfumeStrength.count === 0
        ? 0
        : noteStatsObject[id].avgPerfumeStrength.sum /
          noteStatsObject[id].avgPerfumeStrength.count;

    for (const key in noteStatsObject[id].usedFor) {
      noteStatsObject[id].usedFor[key].avg =
        noteStatsObject[id].usedFor[key].count === 0
          ? 0
          : noteStatsObject[id].usedFor[key].sum /
            noteStatsObject[id].usedFor[key].count;
    }

    noteStatsObject[id].usedWith = Object.keys(noteStatsObject[id].usedWith)
      .map((key) => ({
        id: key,
        name: noteStatsObject[key]?.name,
        count: noteStatsObject[id].usedWith[key],
      }))
      .sort((a, b) => (a.count > b.count ? -1 : 1));

    noteStatsObject[id].usedFor = Object.keys(noteStatsObject[id].usedFor)
      .map((key) => ({
        name: key,
        ...noteStatsObject[id].usedFor[key],
        sum: undefined,
      }))
      .sort((a, b) => (a.count > b.count ? -1 : 1));
  }

  let counter = 0;
  for (const i in noteStatsObject) {
    fs.writeFileSync(
      JSON_NOTE_STATS_DIR + `/${i}.json`,
      JSON.stringify(noteStatsObject[i])
    );
    counter++;
    if (counter % 100 === 0) console.log("Wrote 100 JSON records");
  }
}

function readNoteStatisticsFromPerfume(perfume, noteStatsObject) {
  for (let i = 0; i < perfume.allNotes.length; i++) {
    const note = perfume.allNotes[i];

    // USED AS
    const isBase = (perfume.baseNoteIds || []).indexOf[note] >= 0;
    const isMid = (perfume.midNoteIds || []).indexOf[note] >= 0;
    const isTop = (perfume.topNoteIds || []).indexOf[note] >= 0;
    noteStatsObject[note].usedAs.any++;
    if (isBase) noteStatsObject[note].usedAs.base++;
    if (isMid) noteStatsObject[note].usedAs.mid++;
    if (isTop) noteStatsObject[note].usedAs.top++;
    if (!isBase && !isMid && !isTop) noteStatsObject[note].usedAs.unknown++;

    // USED WITH
    const otherNotes = perfume.allNotes.filter((i) => i !== note);
    for (let o = 0; o < otherNotes.length; o++) {
      noteStatsObject[note].usedWith[otherNotes[o]] =
        noteStatsObject[note].usedWith[otherNotes[o]] || 0;
      noteStatsObject[note].usedWith[otherNotes[o]]++;
    }

    // USED FOR
    for (let a = 0; a < perfume.accords.length; a++) {
      const name = perfume.accords[a].name;
      const currentUsedFor = noteStatsObject[note].usedFor[name] || {
        count: 0,
        sum: 0,
      };
      noteStatsObject[note].usedFor[name] = currentUsedFor;
      noteStatsObject[note].usedFor[name].count++;
      noteStatsObject[note].usedFor[name].sum += perfume.accords[a].strength;
    }

    // AVERAGES
    noteStatsObject[note].avgPerfumeRating.count++;
    noteStatsObject[note].avgPerfumeRating.sum += perfume.avgRating;
    noteStatsObject[note].avgPerfumeLongevity.count++;
    noteStatsObject[note].avgPerfumeLongevity.sum += perfume.longevity;
    noteStatsObject[note].avgPerfumeStrength.count++;
    noteStatsObject[note].avgPerfumeStrength.sum += perfume.strength;
  }
}

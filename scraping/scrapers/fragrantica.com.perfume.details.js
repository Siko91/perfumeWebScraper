/* eslint-disable react-hooks/rules-of-hooks */
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const pageLoader = require("../utils/pageLoader");
const Db = require("../utils/db");

let knownPerfumes = require("../storage/json/fragrantica.com.perfumes.overview.json");

function toFileName(name) {
  return name.replace(/[^a-zA-Z0-9 -]/g, "_");
}

const DB_HTML =
  __dirname + "/../storage/db/fragrantica.com.perfumes.raw.unqlite";

const DB_PARSED = __dirname + "/../storage/db/fragrantica.com.perfumes.unqlite";

main().catch((e) => {
  console.error(e);
});

async function main() {
  // await storeHtml();
  await parseHtml();
  console.log("DONE!");
}

async function moveHtmlFilesToDb() {
  await Db.moveHtmlFilesToDb(
    DB_HTML,
    knownPerfumes.map(
      (perfume) =>
        `${__dirname}/../storage/html/fragrantica.com.perfumes/` +
        `${perfume.id} - ${toFileName(perfume.name)}.html`
    ),
    knownPerfumes.map((i) => i.id)
  );
}

async function storeHtml() {
  await Db.useLevelDb(DB_HTML, async (db) => {
    for (let i = 0; i < knownPerfumes.length; i++) {
      const perfume = knownPerfumes[i];

      if (await db.exists(perfume.id)) continue;

      await pageLoader.getHtmlOfPages(
        "#perfumegraph, #showDiagram, .vote-button-name, .notes-box, .link-span, .span-link",
        [perfume.href],
        async (html) => {
          await db.put(perfume.id, html);
          console.log(
            `[${new Date().toISOString()}] Saved #${perfume.id} ${perfume.name}`
          );
          return new Promise((resolve) =>
            setTimeout(() => resolve(), 30 * 1000)
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
      for (let i = 0; i < knownPerfumes.length; i++) {
        const perfume = knownPerfumes[i];
        if (await dbParsed.exists(perfume.id)) continue;

        const html = await dbHtml.get(perfume.id).then((i) => i.toString());
        console.log(`Parsing #${i} (ID=${perfume.id}): ${perfume.name}`);
        const record = parsePerfumeHtml(perfume, html);
        await dbParsed.put(record.id, JSON.stringify(record));
      }
    });
  });
}

function parsePerfumeHtml(perfume, html) {
  const $ = cheerio.load(html);

  const accordBars = toArray($(".accord-bar")).map((el) => {
    return { name: $(el).text(), strength: parseFloat($(el).css("width")) };
  });
  const votes = toArray($(".icon-vote-action"))
    .map((el) => $(el).parent().parent().parent())
    .reduce((obj, el, i, arr) => {
      obj[$(el).text().replace(/\n/g, "").trim()] = parseFloat(
        $(el).find(".voting-small-chart-size > div > div").css("width")
      );
      return obj;
    }, {});

  const avgRating = parseFloat($(`[itemprop="ratingValue"]`).text());
  const ratingCount = parseInt($(`[itemprop="ratingCount"]`).text());
  const ratingNames = ["hate", "dislike", "ok", "like", "love"];
  const ratingLines = ratingNames.map((i) => votes[i]);
  const ratingLineSum = ratingLines.reduce((s, a) => s + a, 0);
  const ratings = ratingLines.map((i) =>
    Math.round((i / ratingLineSum) * ratingCount)
  );

  const seasonNames = ["winter", "spring", "summer", "fall"];
  const seasonVotes = seasonNames.map((i) => votes[i]);
  const adjustedSeasonVotes = seasonVotes.map((v, i, arr) => {
    const prev = arr[i ? i - 1 : arr.length - 1];
    const next = arr[i < arr.length - 1 ? i + 1 : 0];
    return Math.round(v + prev * 0.5 + next * 0.5);
  });
  const preferredSeason = getAverageFromSortedVotes(adjustedSeasonVotes);
  const preferredSeasonExact = Math.round(preferredSeason);

  const preferredDuringTheDay = 1 - votes["night"] / votes["day"]; // 0 to 1

  const perfumerUrl =
    "https://www.fragrantica.com" +
    $(".perfumer-avatar").parent().find("a").attr("href");

  const pyramid = {};
  toArray($("#pyramid h4, #pyramid .link-span")).reduce(
    (category, el, i, arr) => {
      if (el.name === "h4") {
        return $(el).text().trim().toLowerCase().split(" ")[0];
      }
      if (!pyramid[category]) pyramid[category] = [];
      const href = $(el).parent().attr("href");
      pyramid[category].push(
        href
          .match(/-[0-9]+\.html/)
          .toString()
          .replace(".html", "")
          .substring(1)
      );
      return category;
    },
    ""
  );

  const voteButtons = toArray($(".vote-button-name")).reduce(
    (obj, el, i, arr) => {
      obj[$(el).text().replace(/\n/g, "").trim()] = parseInt(
        $(el).parent().parent().find(".vote-button-legend").text()
      );
      return obj;
    },
    {}
  );

  const longevity = getAverageFromSortedVotes(
    ["very weak", "weak", "moderate", "long lasting", "eternal"].map(
      (i) => voteButtons[i]
    )
  );

  const strength = getAverageFromSortedVotes(
    ["intimate", "moderate", "strong", "enormous"].map((i) => voteButtons[i])
  );

  const votedTargetUser = getAverageFromSortedVotes(
    ["female", "more female", "unisex", "more male", "male"].map(
      (i) => voteButtons[i]
    )
  );

  const overpriced = getAverageFromSortedVotes(
    ["great value", "good value", "overpriced", "way overpriced"].map(
      (i) => voteButtons[i]
    )
  );

  const perfumeCarousels = toArray($(".carousel"))
    .map((carousel) => {
      const perfumeLinks = $(carousel).find(".carousel-cell a");
      return {
        name: $(carousel)
          .parent()
          .find("div.strike-title")
          .text()
          .replace(/\n/g, "")
          .trim(),
        perfumeLinks,
        perfumeIds: toArray(perfumeLinks)
          .map((i) => $(i).attr("href"))
          .map((href) =>
            href
              .match(/-[0-9]+\.html/)
              .toString()
              .replace(".html", "")
              .substring(1)
          ),
      };
    })
    .reduce((obj, val, i, arr) => {
      obj[val.name] = val;
      return obj;
    }, {});

  const remindsMeOf =
    perfumeCarousels["This perfume reminds me of"]?.perfumeIds || [];
  const peopleAlsoLike =
    perfumeCarousels["People who like this also like"]?.perfumeIds || [];

  const record = {
    id: perfume.id,
    name: perfume.name,
    href: perfume.href,
    imgSmall: perfume.imgSmall,
    imgBig: perfume.imgBig,
    targetUsers: perfume.targetUsers,
    comments: perfume.comments,
    brand: perfume.subCategory,

    // TODO
    accords: accordBars,
    avgRating: avgRating,
    ratings: ratings, // 0=hate, 4=love
    preferredSeason, // calculate the most appropriate season: winter=1, spring=2, summer=3, fall=4
    preferredSeasonExact,
    preferredDuringTheDay,
    perfumer: perfumerUrl,
    topNoteIds: pyramid["top"],
    midNoteIds: pyramid["middle"],
    baseNoteIds: pyramid["base"],
    allNotes: [
      ...(pyramid[""] || []),
      ...(pyramid["base"] || []),
      ...(pyramid["middle"] || []),
      ...(pyramid["top"] || []),
    ].filter((v, i, arr) => arr.indexOf(v) === i),
    longevity: longevity, // 1-5 scale
    strength: strength, // 1-5 scale
    votedTargetUser, // 1-5 scale, 1=female, 5=male
    overpriced: overpriced, // 1-5 scale
    remindsMeOf: remindsMeOf,
    peopleAlsoLike: peopleAlsoLike,
  };

  return record;
}

function getAverageFromSortedVotes(votes) {
  const votesCount = votes.reduce((sum, v) => sum + v, 0);
  const votesTotal = votes.reduce((sum, v, i) => sum + v * (i + 1), 0);
  return votesTotal / votesCount;
}

function toArray($Array) {
  const arr = [];
  for (let i = 0; i < $Array.length; i++) arr.push($Array[i]);
  return arr;
}

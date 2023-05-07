/* eslint-disable react-hooks/rules-of-hooks */
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const pageLoader = require("../utils/pageLoader");
const Db = require("../utils/db");
const { downloadText } = require("../utils/downloader");

let knownMaterials = require("../storage/json/perfumersWorld.com.materials.overview.json");

const DB_HTML =
  __dirname + "/../storage/db/perfumersWorld.com.materials.raw.unqlite";

const JSON_FILE_PATH =
  __dirname + "/../storage/json/perfumersWorld.com.materials.details.json";

main().catch((e) => console.error(e));

async function main() {
  await storeHtml();
  await parseHtml();
  console.log("DONE!");
}

async function storeHtml() {
  await Db.useLevelDb(DB_HTML, async (db) => {
    for (let i = 0; i < knownMaterials.length; i++) {
      const material = knownMaterials[i];
      if (await db.exists(material.id)) continue;
      const html = await downloadText(material.url);
      await db.put(material.id, html);
      console.log(
        `[${new Date().toISOString()}] Saved #${i} [${material.id}] ${
          material.name
        }`
      );
    }
  });
}

async function parseHtml() {
  const detailedMaterials = [];
  await Db.useLevelDb(DB_HTML, async (dbHtml) => {
    for (let i = 0; i < knownMaterials.length; i++) {
      const material = knownMaterials[i];
      const html = await dbHtml.get(material.id).then((i) => i.toString());
      console.log(
        `Parsing #${i + 1}/${knownMaterials.length} (ID=${material.id}): ${
          material.name
        }`
      );
      const parsed = parseMaterialHtml(material, html);
      if (parsed) detailedMaterials.push(parsed);
    }
  });
  fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(detailedMaterials, null, 2));
  console.log(`DONE - saved ${detailedMaterials.length} detailed materials`);
}

function parseMaterialHtml(material, html) {
  const $ = cheerio.load(html);

  const boxes = toArray($(".box")).map((el) => ({
    name: $(el).find(".box-title")?.text() || "",
    box: $(el),
  }));

  const names = boxes.map((box) => box.name);
  console.log(`Boxes found in "${material.id}" : ${JSON.stringify(names)}`);

  if (boxes.length <= 1) return undefined;

  const shortDescription = fixText(
    boxes
      .find((b) => b.name === "")
      .box.find(`p[itemprop~="description"]`)
      .text()
  );

  const circleChartDataTextStartIndex = html.indexOf("data: [") + 6;
  const circleChartDataTextEndIndex =
    html.indexOf("],", circleChartDataTextStartIndex) + 1;
  const circleChartDataText = html.slice(
    circleChartDataTextStartIndex,
    circleChartDataTextEndIndex
  );
  const odourGroups = circleChartDataText ? eval(circleChartDataText) : [];

  const odourParagraphs = toArray(
    boxes.find((b) => b.name === "Odour").box.find(`p > b`)
  ).map((b) => {
    const boldText = fixText($(b).text());
    return {
      title: boldText.split("=>")[0].trim(),
      value: fixText($(b).parent().text()).split("=>")[1],
    };
  });

  const odourMetrics = toArray(
    boxes.find((b) => b.name === "Odour").box.find(`ul li`)
  ).map((li) => {
    const value = fixText($(li).find("span").text());
    const fullText = fixText($(li).text());
    return {
      title: fullText.substring(0, fullText.length - value.length).trim(),
      value: parseFloat(value) || value,
    };
  });

  const synonyms = fixText(
    boxes
      .find((b) => b.name === "Synonyms")
      .box.find(`.box-body`)
      .text()
  )
    .split(":")
    .map((i) => i.trim());

  const descriptors = toArray(
    boxes.find((b) => b.name === "Description").box.find(`table tbody tr`)
  ).map((tr) => {
    const [td1, td2] = toArray($(tr).find("td"));
    return { title: fixText($(td1).text()), value: fixText($(td2).text()) };
  });

  const regulatory = toArray(
    boxes.find((b) => b.name === "Regulatory").box.find(`table tbody tr`)
  )
    .map((tr) => {
      const [td1, td2] = toArray($(tr).find("td"));
      return { title: fixText($(td1).text()), value: fixText($(td2).text()) };
    })
    .filter((i) => i);
  const safetyNotesIndex = regulatory.findIndex(
    (val) => val.title === "Safety Notes"
  );
  if (safetyNotesIndex) regulatory.splice(safetyNotesIndex, 1);

  const casNumber =
    regulatory.find((i) => i.title === "CAS No.")?.value || undefined;
  const femaNumber =
    regulatory.find((i) => i.title === "FEMA")?.value || undefined;

  const ifraDocsLink = boxes
    .find((b) => b.name === "Regulatory")
    .box.find(`table tbody tr td a[target~="_blank"]`);
  const ifraDocsUrl = ifraDocsLink
    ? "https://www.perfumersworld.com/" + ifraDocsLink.attr("href")
    : undefined;

  if (ifraDocsLink) {
    const indexToReplace = regulatory.findIndex(
      (i) => i.title.indexOf("DOCUMENTATION") >= 0
    );
    if (indexToReplace >= 0) regulatory.splice(indexToReplace, 1);
    regulatory.push({ title: "documentation", value: ifraDocsUrl });
  }

  const decChars = "1234567890.";
  const useAmounts = toArray(
    boxes
      .find((b) => b.name === "Perfumery Applications")
      .box.find(`.description-block`)
  ).map((block) => {
    return {
      title: fixText($(block).find(".description-text").text()).toLowerCase(),
      value: parseFloat(
        fixText($(block).find(".description-percentage").text())
          .split("")
          .filter((i) => decChars.indexOf(i) >= 0)
          .join("")
      ),
    };
  });

  const suitableFor = toArray(
    boxes
      .find((b) => b.name === "Application Suitability")
      .box.find(`.progress-group`)
  ).map((grow) => {
    const title = fixText($(grow).find(".progress-text").text());
    const value = parseInt(fixText($(grow).find(".progress-number").text()));
    return { title, value };
  });

  return {
    ...material, //  name | url | id | unit | price | defaul_quantity
    casNumber,
    femaNumber,
    shortDescription,
    odourGroups,
    odourParagraphs,
    odourMetrics,
    synonyms,
    descriptors,
    regulatory,
    ifraDocsUrl,
    useAmounts,
    suitableFor,
  };
}

function toArray($Array) {
  const arr = [];
  for (let i = 0; i < $Array.length; i++) arr.push($Array[i]);
  return arr;
}
function fixText(text) {
  return (text + "")
    .replace(/\n/g, " ")
    .split(" ")
    .filter((i) => i.length > 0)
    .join(" ");
}

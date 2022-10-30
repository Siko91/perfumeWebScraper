const Crawler = require("crawler");
const fs = require("fs");
const path = require("path");

main().catch((e) => console.error(e));

async function main() {
  const c = new Crawler({
    maxConnections: 10,
    callback: (error, res, done) => {
      if (error) {
        console.log(error);
      } else {
        const $ = res.$;
        const categoriesAndNotes = $(".cell.gone4empty h2, .cell.notebox a");

        let currentCategory = "<UNKNOWN CATEGORY>";

        const notes = [];

        for (let i = 0; i < categoriesAndNotes.length; i++) {
          const el = categoriesAndNotes[i];
          const elText = $(el).text().replace(/\n/g, "").trim();
          if (el.name === "h2") {
            currentCategory = elText;
            continue;
          }

          notes.push({
            category: currentCategory,
            name: elText,
            href: $(el).attr("href"),
            img: $(el).find("img").attr("src"),
          });
        }

        const fileToSave =
          __dirname +
          "/../storage/json/" +
          __filename.replace(/^.*[\\\/]/, "").replace(".js", ".json");
        fs.writeFileSync(fileToSave, JSON.stringify(notes, null, 2));
      }
      done();
    },
  });

  // HTML manually copied from "https://www.fragrantica.com/notes"
  c.queue({
    html: fs.readFileSync(
      __dirname + "/../storage/html/fragrantica.com.notes.html"
    ),
  });
}

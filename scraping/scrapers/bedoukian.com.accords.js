const stream = require("stream");
const { promisify } = require("util");
const fs = require("fs");
const Axios = require("axios");
const { downloadFile } = require("../utils/downloader")

const accordsToDownload = [
  "https://bedoukian.com/wp-content/uploads/Accord-Peach-Blossom-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Apricot-8.5x11-2.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Butterscotch-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Cardamom-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Tarte-Tatin-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Vibe-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Fleur-D-Orange-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Osmanthus-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Slice-of-Watermelon-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Pink-Guava-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Sultry-HoneySuckle-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Miss-Bliss-8.5x11-2.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Soothing-Green-Tea-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Luscious-Lemon-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Green-Dream-8.5x11-2.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Flower-Garden-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Blue-Lavender-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Chocolate-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Lovely-Lemon-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Captive-Tides-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Fruity-Floral-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Pineapple-Oasis-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Floriental-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Holiday-Pumpkin-Spice-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Samurai-8.5x11-1.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Citrus-Delight-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Tangy-Tangerine-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Spice-Market-728-and-818-8.5x11-1.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Alluring-Acacia-8.5x11.pdf",
  "https://bedoukian.com/wp-content/uploads/Accord-Rain-Kissed-Leaves-8.5x11.pdf",
].map((url) => {
  const parts = url.split("/");
  return {
    url,
    fileName: parts[parts.length - 1],
  };
});

main().catch((e) => console.error(e));

async function main() {
  await downloadPDFs();
  console.log("DONE!");
}

async function downloadPDFs() {
  for (const accord of accordsToDownload) {
    console.log("Downloading " + accord.url);
    const savedFilePath = __dirname + "/../storage/pdf/" + accord.fileName;
    await downloadFile(accord.url, savedFilePath);
  }
}

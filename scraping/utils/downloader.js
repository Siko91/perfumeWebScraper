const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const pageLoader = require("../utils/pageLoader");
const { parseHTML } = require("cheerio");
const Axios = require("axios");

const stream = require("stream");
const { promisify } = require("util");

const finished = promisify(stream.finished);

async function downloadFile(fileUrl, outputLocationPath) {
  const writer = fs.createWriteStream(outputLocationPath);
  return Axios({
    method: "get",
    url: fileUrl,
    responseType: "stream",
  }).then((response) => {
    response.data.pipe(writer);
    return finished(writer); //this is a Promise
  });
}

async function downloadText(url) {
  const text = await Axios({
    method: "get",
    url: url,
  }).then((response) => {
    return response.data;
  });
  return text.toString() + ""
}

module.exports = {
  downloadFile,
  downloadText,
};

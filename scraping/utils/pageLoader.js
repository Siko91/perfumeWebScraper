const { html } = require("cheerio");
const puppeteer = require("puppeteer");


async function getHtmlOfPage(url, selectorToWaitFor) {
  const [html] = await getHtmlOfPages(selectorToWaitFor, url);
  return html;
}

async function getHtmlOfPages(selectorToWaitFor, url, ...urlList) {
  urlList = [url, ...urlList];

  const browser = await puppeteer.launch({ headless: false });
  const promises = [];

  for (let i = 0; i < urlList.length; i++) {
    const promise = (async () => {
      const url = urlList[i];
      const page = await browser.newPage();
      await page.goto(url);
      await page.waitForNetworkIdle();
      if (selectorToWaitFor) {
        await page.waitForSelector(selectorToWaitFor);
      }
      const html = await page.content();
      return html;
    })();
    promises.push(promise);
  }

  const htmlResults = await Promise.all(promises);
  browser.close();
  return htmlResults;
}

module.exports = {
  getHtmlOfPage,
  getHtmlOfPages,
};

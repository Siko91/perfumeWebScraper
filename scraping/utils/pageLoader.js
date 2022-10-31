const axios = require("axios");
const { html } = require("cheerio");
const puppeteer = require("puppeteer");

async function getHtmlOfPage(url, selectorToWaitFor) {
  return new Promise((resolve, reject) => {
    getHtmlOfPages(selectorToWaitFor, [url], (result) => resolve(result));
  });
}

async function getHtmlOfPages(
  selectorToWaitFor,
  fullUrlList,
  eachResultCallback,
  concurrentRequestLimit = 5
) {
  return await doTasksInBatches(
    fullUrlList,
    async (urlBatch) => {
      const browser = await puppeteer.launch({ headless: false });
      const promises = urlBatch.map((url) => {
        return (async () => {
          const page = await browser.newPage();
          await page.goto(url);
          await page.waitForNetworkIdle();
          if (selectorToWaitFor) {
            await page.waitForSelector(selectorToWaitFor);
          }
          const html = await page.content();
          return html;
        })();
      });
      const htmlResults = await Promise.all(promises);
      await browser.close();

      return htmlResults;
    },
    eachResultCallback,
    concurrentRequestLimit
  );

  // const browser = await puppeteer.launch({ headless: false });
  // const promises = [];
  // for (let i = 0; i < urlList.length; i++) {
  //   const promise = (async () => {
  //     const url = urlList[i];
  //     const page = await browser.newPage();
  //     await page.goto(url);
  //     await page.waitForNetworkIdle();
  //     if (selectorToWaitFor) {
  //       await page.waitForSelector(selectorToWaitFor);
  //     }
  //     const html = await page.content();
  //     return html;
  //   })();
  //   promises.push(promise);
  // }
  // const htmlResults = await Promise.all(promises);
  // browser.close();
  // return htmlResults;
}

async function forEachAxiosResponse(
  fullUrlList,
  eachResultCallback,
  concurrentRequestLimit = 5
) {
  return await doTasksInBatches(
    fullUrlList,
    (urlBatch) =>
      Promise.all(currentUrlList.map((url) => axios.get(url))).then(
        (i) => i.data
      ),
    eachResultCallback,
    concurrentRequestLimit
  );
}

async function doTasksInBatches(
  fullTaskList,
  batchProcessorCallback,
  eachResultCallback,
  concurrentRequestLimit = 5
) {
  for (let i = 0; i < fullTaskList.length; i += concurrentRequestLimit) {
    const currentTaskList = [];
    const currentIndexes = [];
    for (let s = 0; s < concurrentRequestLimit; s++) {
      if (i + s < fullTaskList.length) {
        const index = i + s;
        currentIndexes.push(index);
        currentTaskList.push(fullTaskList[index]);
      }
    }
    const resultArray = await batchProcessorCallback(
      currentTaskList,
      currentIndexes
    );
    resultArray.map((data, i) =>
      eachResultCallback(data, i, currentTaskList[i])
    );
  }
}

module.exports = {
  getHtmlOfPage,
  getHtmlOfPages,
  forEachAxiosResponse,
};

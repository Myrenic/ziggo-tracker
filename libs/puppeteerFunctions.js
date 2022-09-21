const puppeteer = require("puppeteer");
const appConfig = require("../config/config");

async function retrieveRawTableData() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(appConfig.url); // open appConfig.url
  await page.type("#Password", appConfig.password); //type password in box
  await page.click(".submitBtn"); // submit
  await page.waitForNetworkIdle(); // wait for it all to load
  await page.goto(appConfig.url + "/?device_connection&mid=ConnectedDevices"); // nav to devices page
  await page.waitForNetworkIdle(); // wait again
  const rows = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        'table[id="AttachedDevicesTable"] > tbody > tr'
      ),
      (row) =>
        Array.from(row.querySelectorAll("th, td"), (cell) => [cell.innerText])
    )
  ); // extract devices table
  await page.click("#logout > a"); // logout from interface to prevent blocking
  await browser.close(); // close browser
  return rows;
}

module.exports = { retrieveRawTableData };

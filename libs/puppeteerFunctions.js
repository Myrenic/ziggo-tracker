const puppeteer = require("puppeteer");

async function retrieveRawTableData() {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: "google-chrome-stable",
  });
  const page = await browser.newPage();

  await page.goto(process.env.router_url); // open url
  await page.type("#Password", process.env.router_password); //type password in box
  await page.click(".submitBtn"); // submit
  await page.waitForNetworkIdle(); // wait for it all to load
  await page.goto(
    process.env.router_url + "/?device_connection&mid=ConnectedDevices"
  ); // nav to devices page
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
  try {
    await page.click("#logout > a"); // logout from interface to prevent blocking
  } catch (error) {
    console.log("Could not log out due to an error, skipping");
  } finally {
    await browser.close(); // close browser
    return rows;
  }
}

module.exports = { retrieveRawTableData };

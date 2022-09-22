"use strict";

const fs = require("fs");
const appConfig = require("./config/config");
const mqttFunctions = require("./libs/mqttFunctions");
const puppeteerFunctions = require("./libs/puppeteerFunctions");

async function main() {
  // getting data array's & macs
  let newDataRaw = JSON.stringify(
    await puppeteerFunctions.retrieveRawTableData()
  );
  let newDataArray = JSON.parse(newDataRaw);

  // looping trough array to extract macs and push them into own array
  let newMacs = [];
  newDataArray.forEach((element) => {
    newMacs.push(element[1][0]);
  });

  // getting old data array & macs
  let oldDataRaw = fs.readFileSync("./storage/devices.json", "utf8");
  let oldDataArray = JSON.parse(oldDataRaw);

  // looping trough array to extract macs and push them into own array
  let oldMacs = [];
  oldDataArray.forEach((element) => {
    oldMacs.push(element[1][0]);
  });

  // check 2 mac lists to see which device has gone online or offline
  let GoneSinceLastScan = oldMacs.filter((x) => !newMacs.includes(x));
  let AppearedSinceLastScan = newMacs.filter((x) => !oldMacs.includes(x));

  GoneSinceLastScan.forEach((e) => {
    // getting info of object
    oldDataArray.forEach((element) => {
      if (element[1] == e) {
        mqttFunctions.updateAllMqttTopics(
          element[0][0],
          e.replaceAll(":", ""),
          "not_home"
        ); // replace all to cleanup mac-format for mqtt support
      }
    });
  });

  AppearedSinceLastScan.forEach((e) => {
    // getting info of object
    newDataArray.forEach((element) => {
      if (element[1] == e) {
        mqttFunctions.updateAllMqttTopics(
          element[0][0],
          e.replaceAll(":", ""),
          "home"
        ); // replace all to cleanup mac-format for mqtt support
      }
    });
  });

  // writing back new list of devices to json file
  fs.writeFileSync("./storage/devices.json", JSON.stringify(newDataArray));
}

(function loop() {
  setTimeout(function () {
    try {
      main();
    } catch (error) {
      console.log("Error! ", error);
    } finally {
      loop();
    }
  }, 90000); // timeout in ms
})();

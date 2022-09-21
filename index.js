"use strict";

const mqtt = require("mqtt");
const C = require("./config");
const fs = require("fs");
const puppeteer = require("puppeteer");
const appConfig = require("./config");

// set mqtt info
const clientId = `mqtt_ziggo_gigabox_tracker`;
const connectUrl = `mqtt://${C.host}:${C.port}`;

function openMqttClient() {
  return mqtt.connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: C.mqtt_user,
    password: C.mqtt_password,
    reconnectPeriod: 1000,
  });
}

async function retrieveRawTableData() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(appConfig.url); // open c.url
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

// create new dev in HA format, outputs json
function HomeAssistantFactory(Name, Mac) {
  const device = {
    availability_mode: "all",
    name: Name,
    device: {
      identifiers: Mac,
      name: Name,
      connections: [["mac", Mac]],
      via_device: "ziggo-tracker-distributed",
    },
    unique_id: `ziggo-tracker-${Mac}_tracker`,
    state_topic: `ziggo-tracker/device_tracker/${Mac}_tracker/state`,
    json_attributes_topic: `ziggo-tracker/device_tracker/${Mac}_tracker/attributes`,
    payload_home: "home",
    payload_not_home: "not_home",
    source_type: "router",
  };
  return JSON.stringify(device);
}

// create string from HomeAssistantFactory(Name, Mac) and send it to mqtt.
function publishToHATopic(Name, Mac, client) {
  client.publish(
    `homeassistant/device_tracker/ziggo-tracker/${Mac}_tracker/config`,
    HomeAssistantFactory(Name, Mac),
    { qos: 0, retain: true },
    (error) => {
      if (error) {
        console.error(error);
      }
    }
  );
}

// send state to mqtt
function publishToZiggoTopic(Mac, state, client) {
  client.publish(
    `ziggo-tracker/device_tracker/${Mac}_tracker/state`,
    state,
    { qos: 0, retain: true },
    (error) => {
      if (error) {
        console.error(error);
      }
    }
  );
}

function updateAllMqttTopics(Name, Mac, State) {
  const client = openMqttClient();
  publishToZiggoTopic(Mac, State, client);
  publishToHATopic(Name, Mac, client);

  var currentdate = new Date();
  console.log(
    currentdate.getDate() +
      "/" +
      (currentdate.getMonth() + 1) +
      "/" +
      currentdate.getFullYear() +
      " @ " +
      currentdate.getHours() +
      ":" +
      currentdate.getMinutes() +
      ":" +
      currentdate.getSeconds() +
      ` ${Mac} (${Name}) has been updated to: "${State}"`
  );
}

async function main() {
  // getting data array's & macs
  let newDataRaw = JSON.stringify(await retrieveRawTableData());
  let newDataArray = JSON.parse(newDataRaw);

  // looping trough array to extract macs and push them into own array
  let newMacs = [];
  newDataArray.forEach((element) => {
    newMacs.push(element[1][0]);
  });

  // getting old data array & macs
  let oldDataRaw = fs.readFileSync("devices.json", "utf8");
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
        updateAllMqttTopics(element[0][0], e.replaceAll(":", ""), "not_home"); // replace all to cleanup mac-format for mqtt support
      }
    });
  });

  AppearedSinceLastScan.forEach((e) => {
    // getting info of object
    newDataArray.forEach((element) => {
      if (element[1] == e) {
        updateAllMqttTopics(element[0][0], e.replaceAll(":", ""), "home"); // replace all to cleanup mac-format for mqtt support
      }
    });
  });

  // writing back new list of devices to json file
  fs.writeFileSync("devices.json", JSON.stringify(newDataArray));
}

(function loop() {
  setTimeout(function () {
    main();
    loop();
  }, 90000); // timeout in ms
})();

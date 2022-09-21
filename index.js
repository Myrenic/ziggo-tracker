"use strict";

const mqtt = require("mqtt");
const C = require("./config");
const fs = require("fs");
const puppeteer = require("puppeteer");
const appConfig = require("./config");

async function retrieveRawTableData() {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  await page.goto(appConfig.url);
  await page.type("#Password", appConfig.password);
  await page.click(".submitBtn");
  await page.waitForNetworkIdle();
  await page.goto(appConfig.url + "/?device_connection&mid=ConnectedDevices");
  await page.waitForNetworkIdle();
  const rows = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        'table[id="AttachedDevicesTable"] > tbody > tr'
      ),
      (row) =>
        Array.from(row.querySelectorAll("th, td"), (cell) => [cell.innerText])
    )
  );
  await page.click("#logout > a");
  await browser.close();
  return rows;
}

// set mqtt info
const clientId = `mqtt_ziggo_gigabox_tracker`;
const connectUrl = `mqtt://${C.host}:${C.port}`;
// connect to mqtt
// const client = mqtt.connect(connectUrl, {
//   clientId,
//   clean: true,
//   connectTimeout: 4000,
//   username: C.mqtt_user,
//   password: C.mqtt_password,
//   reconnectPeriod: 1000,
// });
// Create MQTT template for home assistant mqtt topic

function refreshmqtt() {
  return mqtt.connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: C.mqtt_user,
    password: C.mqtt_password,
    reconnectPeriod: 1000,
  });
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
function publishToHA(Name, Mac, client) {
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
function publishToZiggoTracker(Mac, state, client) {
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

function send2mqtt(Name, Mac, State) {
  const client = refreshmqtt();
  publishToZiggoTracker(Mac, State, client);
  publishToHA(Name, Mac, client);

  var currentdate = new Date();
  var datetime =
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
    `${Mac} (${Name}) has been updated to: "${State}"`;

  console.log(datetime);
}

async function main() {
  // getting new data array
  let newDataRaw = JSON.stringify(await retrieveRawTableData());
  let newDataArray = JSON.parse(newDataRaw);
  let newMacs = [];
  newDataArray.forEach((element) => {
    newMacs.push(element[1][0]);
  });
  // old data array
  let oldDataRaw = fs.readFileSync("devices.json", "utf8");
  let oldDataArray = JSON.parse(oldDataRaw);
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
        send2mqtt(element[0][0], e.replaceAll(":", ""), "not_home");
      }
    });
  });

  AppearedSinceLastScan.forEach((e) => {
    // getting info of object
    newDataArray.forEach((element) => {
      if (element[1] == e) {
        send2mqtt(element[0][0], e.replaceAll(":", ""), "home");
      }
    });
  });
  // writing back new list to json
  fs.writeFileSync("devices.json", JSON.stringify(newDataArray));
}

(function loop() {
  setTimeout(function () {
    // execute script
    main();
    loop();
  }, 90000); //9000 = 9000ms = 9s
})();

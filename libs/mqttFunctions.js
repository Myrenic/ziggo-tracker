const mqtt = require("mqtt");
const appConfig = require("../config/config");

// set mqtt info
const clientId = `mqtt_ziggo_gigabox_tracker`;
const connectUrl = `mqtt://${appConfig.host}:${appConfig.port}`;

function openMqttClient() {
  return mqtt.connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: appConfig.mqtt_user,
    password: appConfig.mqtt_password,
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

module.exports = { updateAllMqttTopics };

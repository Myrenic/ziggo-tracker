const mqtt = require("mqtt");

// set mqtt info
const clientId = `mqtt_ziggo_gigabox_tracker`;
const connectUrl = `mqtt://${process.env.mqtt_host}:${process.env.mqtt_port}`;

const client = mqtt.connect(connectUrl, {
  clientId,
  clean: true,
  connectTimeout: 4000,
  username: process.env.mqtt_user,
  password: process.env.mqtt_password,
  reconnectPeriod: 1000,
});

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

function PublicTopic(Mac, Name, State) {
  // publish device state to ziggo topic
  client.publish(
    `ziggo-tracker/device_tracker/${Mac}_tracker/state`,
    State,
    { qos: 0, retain: true },
    (error) => {
      if (error) {
        console.error(error);
      }
    }
  );

  // public device props to HA topic
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

function updateAllMqttTopics(ListOfMacs, ListOfDeviceInfo, State) {
  ListOfMacs.forEach((e) => {
    // getting info of object
    ListOfDeviceInfo.forEach((element) => {
      if (element[1] == e) {
        client.on("connect", () => {
          PublicTopic(e.replaceAll(":", ""), element[0][0], State);
        });
      }
    });
  });
}

module.exports = { updateAllMqttTopics };

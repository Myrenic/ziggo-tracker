const secrets = require("./secrets");

module.exports = {
  password: secrets.password,
  url: "http://192.168.178.1",
  mqtt_user: secrets.mqtt_user,
  mqtt_password: secrets.mqtt_password,
  host: "192.168.178.2",
  port: "1883",
};

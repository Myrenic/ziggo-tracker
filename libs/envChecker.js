async function checkEnvironmentVariables() {
  const vars = [
    "router_url",
    "router_password",
    "mqtt_host",
    "mqtt_user",
    "mqtt_password",
    "mqtt_port",
  ];
  vars.forEach((element) => {
    if (!process.env.element) {
      console.log(`${element} not set, aborting.`);
      process.exit();
    }
  });
}

module.exports = { checkEnvironmentVariables };

const manager_eci = "ckzom7hhm005xi8wea9vugkrj";
const base_url = "http://localhost:3000/sky";

const sensors_to_create = ["sensor 1", "sensor 2", "sensor 3", "sensor 4", "sensor 5", "sensor 6"];

const create_sensor = async (name) => {
  const url = `${base_url}/event/${manager_eci}/create-sensor/sensor/new_sensor`;
  await axios.post(url, {name});
};

const get_sensors = async () => {
  const url = `${base_url}/cloud/${manager_eci}/manage_sensors/sensors`;
  const response = await axios.get(url);
  return response.data;
};

const pause_emitter = async (eci) => {
  const url = `${base_url}/event/${eci}/pause-emitter/emitter/new_state`;
  await axios.post(url, {pause: "true"});
};

const delete_sensor = async (name) => {
  const url = `${base_url}/event/${manager_eci}/create-sensor/sensor/unneeded_sensor`;
  const response = await axios.post(url, {name});
  return response.data;
};

const send_temperature = async (eci, temp) => {
  const url = `${base_url}/event/${eci}/heartbeat/wovyn/heartbeat`;
  const response = await axios.post(url, {genericThing: {data: { temperature: [{temperatureF: temp}] }}});
  return response.data;
};

const get_sensor_temperatures = async (eci) => {
  const url = `${base_url}/cloud/${eci}/temperature_store/temperatures`;
  const response = await axios.get(url);
  return response.data;
};

const get_all_temperatures = async () => {
  const url = `${base_url}/cloud/${manager_eci}/manage_sensors/temperatures`;
  const response = await axios.get(url);
  return response.data;
};

const get_profile = async (eci) => {
  const url = `${base_url}/cloud/${eci}/sensor_profile/profile`;
  const response = await axios.get(url);
  return response.data;
};

const run_tests = async () => {
  // create sensors
  document.write("<br>Creating sensors...<br>");
  for (const sensor of sensors_to_create) {
    document.write(`Creating sensor: ${sensor}... `);
    await create_sensor(sensor);
    document.write('Created!<br>');
  }
  
  // check sensors exist
  document.write("<br>Checking for sensors stored in sensor manager...<br>");
  let sensors = await get_sensors();
  document.write(`Sensors retrieved:<pre>${JSON.stringify(sensors, null, 1)}</pre>`);
  for (const sensor of sensors_to_create) {
    document.write(`Checking for sensor: ${sensor}... `);
    if (sensors[sensor]) {
      document.write("<span style='color: green'>Found!</span><br>");
    } else {
      document.write(`<span style='color: red'>Error! Could not find sensor.</span><br>`);
      return;
    }
  }

  // reserve 1st sensor for physical device
  document.write(`<br>Reserving ${sensors_to_create[0]} pico for use with physical sensor...<br>`);
  let sensor = sensors[sensors_to_create[0]];
  while (!sensor.ready) {
    document.write('Waiting for sensor to be ready...');
    sensors = await get_sensors();
    sensor = sensors[sensors_to_create[0]];
  }
  const eci = sensor.sensor_eci;
  document.write("Pausing emitter... ");
  await pause_emitter(eci);
  document.write("Paused!<br>");
  document.write(`Emitter paused for ${sensors_to_create[0]}. Send heartbeat events to ${base_url}/event/${eci}/heartbeat/wovyn/heartbeat<br>`);

  // delete second and last sensor
  document.write(`<br>Deleting sensors: ${sensors_to_create[1]} and ${sensors_to_create[sensors_to_create.length -1]}<br>`);
  for (let i = 0; i < 2; i++) {
    let name;
    if (i === 0) {
      name = sensors_to_create[1];
    } else {
      name = sensors_to_create[sensors_to_create.length -1];
    }
    document.write(`Deleting sensor: ${name}... `);
    const response = await delete_sensor(name);
    if (response.directives[0] && response.directives[0].name === 'deleting_sensor' && response.directives[0].options.sensor_name === name) {
      document.write("<span style='color: green'>Deleted!</span><br>");
    } else {
      document.write(`<span style='color: red'>Error! Could not delete sensor.</span><br>`);
      return;
    }
  }

  // check delete sensors don't exist
  document.write("<br>Checking that deleted sensors are gone...<br>");
  sensors = await get_sensors();
  document.write(`Sensors retrieved:<pre>${JSON.stringify(sensors, null, 1)}</pre>`);
  for (let i = 0; i < sensors_to_create.length; i++) {
    sensor = sensors_to_create[i];
    if ((i !== 1) && (i !== (sensors_to_create.length - 1))) {
      document.write(`Checking for sensor: ${sensor}... `);
      if (sensors[sensor]) {
        document.write("<span style='color: green'>Found!</span><br>");
      } else {
        document.write(`<span style='color: red'>Error! Could not find sensor.</span><br>`);
        return;
      }
    } else {
      document.write(`Checking sensor does not exist: ${sensor}... `);
      if (!sensors[sensor]) {
        document.write("<span style='color: green'>Not found!</span><br>");
      } else {
        document.write(`<span style='color: red'>Error! Sensor not deleted.</span><br>`);
        return;
      }
    }
  }

  // send temperature events to first and third sensor
  document.write(`<br>Sending temperature events to sensors: ${sensors_to_create[0]} and ${sensors_to_create[2]}<br>`);
  for (let i = 0; i < 2; i++) {
    let name;
    let temp;
    let eci;
    if (i === 0) {
      name = sensors_to_create[0];
      temp = 41;
    } else {
      name = sensors_to_create[2];
      temp = 103;
    }
    eci = sensors[name].sensor_eci;
    document.write(`Sending temperature ${temp} to ${name}... `);
    const response = await send_temperature(eci, temp);
    if (response.directives[0] && response.directives[0].name === 'heartbeat' && response.directives[0].options.body === "Temperature reading received") {
      document.write("<span style='color: green'>Sent!</span><br>");
    } else {
      document.write(`<span style='color: red'>Error! Could not send temperature reading.</span><br>`);
      return;
    }
  }

  // check temperatures returned from sensor
  document.write(`<br>Checking temperatures stored for sensors: ${sensors_to_create[0]} and ${sensors_to_create[2]}<br>`);
  for (let i = 0; i < 2; i++) {
    let name;
    let temp;
    let eci;
    if (i === 0) {
      name = sensors_to_create[0];
      temp = 41;
    } else {
      name = sensors_to_create[2];
      temp = 103;
    }
    eci = sensors[name].sensor_eci;
    document.write(`Retrieving temperatures from sensor: ${name}...<br>`);
    const temps = await get_sensor_temperatures(eci);
    document.write(`Temperatures retrieved:<pre>${JSON.stringify(temps, null, 1)}</pre>`);
    document.write(`Checking for temperature ${temp} in ${name}... `);
    if (temps.some((tempLog) => tempLog.temp === temp)) {
      document.write(`<span style='color: green'>Found!</span><br>`);
    } else {
      document.write(`<span style='color: red'>Error! Temperature not found.</span><br>`);
      return;
    }
  }

  // check temperatures returned from manager
  document.write(`<br>Checking temperatures retrieved from manager for sensors: ${sensors_to_create[0]} and ${sensors_to_create[2]}<br>`);
  document.write(`Retrieving temperatures from sensor manager... <br>`);
  const temps = await get_all_temperatures();
  document.write(`Temperatures retrieved:<pre>${JSON.stringify(temps, null, 1)}</pre>`);
  for (let i = 0; i < 2; i++) {
    let name;
    let temp;
    if (i === 0) {
      name = sensors_to_create[0];
      temp = 41;
    } else {
      name = sensors_to_create[2];
      temp = 103;
    }
    document.write(`Checking for temperature ${temp} in ${name}... `);
    const sensor_temps = temps[name];
    if (sensor_temps.some((tempLog) => tempLog.temp === temp)) {
      document.write(`<span style='color: green'>Found!</span><br>`);
    } else {
      document.write(`<span style='color: red'>Error! Temperature not found.</span><br>`);
      return;
    }
  }

  // check profile setup
  document.write(`<br>Checking profiles are correctly initialized for sensors...<br>`);
  for (const sensor in sensors) {
    document.write(`Retrieving profile from ${sensor}...<br>`);
    const eci = sensors[sensor].sensor_eci;
    const profile = await get_profile(eci);
    document.write(`Profile retrieved:<pre>${JSON.stringify(profile, null, 1)}</pre>`);
    document.write(`Checking that name returned is correct... `);
    if (profile.name === sensor) {
      document.write(`<span style='color: green'>Correct!</span><br>`);
    } else {
      document.write(`<span style='color: red'>Error! Name is incorrect.</span><br>`);
      return;
    }
    document.write(`Checking that temperature threshold returned is correct... `);
    if (profile.temperature_threshold === 78) {
      document.write(`<span style='color: green'>Correct!</span><br>`);
    } else {
      document.write(`<span style='color: red'>Error! Temperature threshold is incorrect.</span><br>`);
      return;
    }
  }

  // cleanup
  document.write(`<br>Deleting remaining sensors... <br>`);
  for (const sensor in sensors) {
    await delete_sensor(sensor);
  }
  document.write(`<br><span style='color: green'>Testing finished. All checks pass!</span><br>`);
};

const stateCheck = setInterval(() => {
  if (document.readyState === 'complete') {
    clearInterval(stateCheck);
    document.write("<h1>Sensor Manager Testing</h1>");
    document.write("Beginning testing...<br>");
    run_tests();
  }
}, 100);

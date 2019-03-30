load('api_aws.js');
load('api_config.js');
load('api_events.js');
load('api_gcp.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_shadow.js');
load('api_timer.js');
load('api_sys.js');
load('api_watson.js');

//let btn = Cfg.get('board.btn1.pin');              // Built-in button GPIO
let coolPin = 26;              // Built-in LED GPIO number
let warmPin = 25;
let state = {
  warm: false,
  cool: false,
  currTemp: 15,
  desiredTemp: 15,
  upTime: 0
};  // Device state
let online = false;                               // Connected to the cloud?



let coolSW = function (cool) {
  let level = cool ? 0 : 1;
  GPIO.write(coolPin, level);
  print('LED1 on ->', cool);
};

let warmSW = function (warm) {
  let level = warm ? 0 : 1;
  GPIO.write(warmPin, level);
  print('LED2 on ->', warm);
};

GPIO.set_mode(coolPin, GPIO.MODE_OUTPUT);
GPIO.set_mode(warmPin, GPIO.MODE_OUTPUT);

coolSW(state.cool);
warmSW(state.warm);

function updateSW() {
  
  // HERE: get temp and save in currTemp

  state.cool = false;
  state.warm = false;

  if (state.currTemp > state.desiredTemp) {
    state.cool = true;
  }
  if (state.currTemp < state.desiredTemp) {
    state.warm = true;
  }
  coolSW(state.cool);
  warmSW(state.warm);
}

Timer.set(8000, Timer.REPEAT, updateSW, null);

// Update state every second, and report to cloud if online
Timer.set(2000, Timer.REPEAT, function () {
  state.ram_free = Sys.free_ram();
  state.upTime = Sys.uptime();
  print("state advertised.");
  MQTT.pub("local/state", JSON.stringify(state), 1, false);
  
}, null);


MQTT.sub("event/desiredTemp", function(conn, topic, msg) {
  state.desiredTemp = JSON.parse(msg);
  updateSW();
});

MQTT.sub("event/warm", function(conn, topic, msg) {
  state.warm = (msg === 'true');
  warmSW(state.warm);
});

// Set up Shadow handler to synchronise device state with the shadow state
/*Shadow.addHandler(function (event, obj) {
  if (event === 'UPDATE_DELTA') {
    print('GOT DELTA:', JSON.stringify(obj));
    for (let key in obj) {  // Iterate over all keys in delta
      if (key === 'cool') {  // We know about the 'on' key. Handle it!
        state.cool = obj.cool;  // Synchronise the state
        coolSW(state.cool);   // according to the delta
      }
      if (key === 'warm') {  // We know about the 'on' key. Handle it!
        state.warm = obj.warm;  // Synchronise the state
        warmSW(state.warm);   // according to the delta
      }
    }
    reportState();  // Report our new state, hopefully clearing delta
  }
});

Event.on(Event.CLOUD_CONNECTED, function () {
  online = true;
  Shadow.update(0, { ram_total: Sys.total_ram() });
}, null);

Event.on(Event.CLOUD_DISCONNECTED, function () {
  online = false;
}, null);*/

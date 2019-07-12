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
load('api_rpc.js');
load('api_dht.js');
load('api_net.js');
load('api_esp32.js')

//let mdns_init = ffi('void mgos_esp_mdns_init(void)');


let coolPin = 26;
let warmPin = 25;
let tempPin = 18;
let flag = false;
let ssid = "SSID";
let password = "PASSWORD";
let data = {
  config: {
    wifi: {
      ap: { enable: true },
      sta1: { enable: false },
      sta: { enable: false }
    }
  }
};
let state = {
  id: "esp32",
  name: "",
  warm: false,
  cool: false,
  enabled: false,
  currTemp: 15,
  humidity: 39,
  percTemp: 15,
  desiredTemp: 15,
  timestamp: 0
};

if (Cfg.get('wifi.ap.enable') && !Cfg.get('wifi.sta.enable')) {
  GPIO.blink(2, 250, 250);
} else {
  GPIO.blink(2, 0, 0)
}

state.id = "Mongoose_" + ("" + Cfg.get('device.id')).slice(6, 12);

GPIO.set_mode(2, GPIO.MODE_OUTPUT);
GPIO.set_mode(coolPin, GPIO.MODE_OUTPUT);
GPIO.set_mode(warmPin, GPIO.MODE_OUTPUT);

let online = false;
let myDHT = DHT.create(tempPin, DHT.DHT22);
let state_topic = state.id + '/event/state';
let settemp_topic = state.id + '/event/setTemp';
let onoff_topic = state.id + '/event/onoff';
let status_topic = state.id + '/event/status';
let setname_topic = state.id + '/event/setname';
let general_topic = state.id + '/event/+';



RPC.call(RPC.LOCAL, 'Config.Set', { config: { wifi: {sta1: {enable: true}}, mqtt: { will_topic: status_topic, keep_alive: 15 }, mqtt1: { will_topic: status_topic, keep_alive: 15 } } }, function (resp, ud) {
  RPC.call(RPC.LOCAL, 'Config.Save', { reboot: false }, function (resp, ud) {
    print('Response:', JSON.stringify(resp));
  }, null);
}, null);




GPIO.set_button_handler(0, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 200, function (x) {
  RPC.call(RPC.LOCAL, 'Config.Set', data, function (resp, ud) {
    RPC.call(RPC.LOCAL, 'Config.Save', { reboot: true }, function (resp, ud) {
      print('Response:', JSON.stringify(resp));
    }, null);
  }, null);
}, null);



let coolSW = function (cool) {
  let level = cool ? 0 : 1;
  GPIO.write(coolPin, level);
};

let warmSW = function (warm) {
  let level = warm ? 0 : 1;
  GPIO.write(warmPin, level);
};


coolSW(state.cool);
warmSW(state.warm);
GPIO.write(2, 0);

function updateSW() {

  state.cool = false;
  state.warm = false;

  state.currTemp = Math.round(myDHT.getTemp()*2)/2;
  state.humidity = Math.round(myDHT.getHumidity());

  if(state.currTemp > 60) {
    state.currTemp = 60;
  }
  if (state.humidity > 100) {
    state.humidity = 100;
  }

  if ((state.humidity > 40) && (state.currTemp > 27)) {
    state.percTemp = -8.78469475556 + (1.61139411 * state.currTemp) + (2.33854883889 * state.humidity) +
      (-0.14611605 * state.currTemp * state.humidity) + (-0.012308094 * state.currTemp * state.currTemp) +
      (-0.0164248277778 * state.humidity * state.humidity) + (0.002211732 * state.currTemp * state.currTemp * state.humidity) +
      (0.00072546 * state.humidity * state.humidity * state.currTemp) +
      (-0.000003582 * state.humidity * state.humidity * state.currTemp * state.currTemp);
    state.percTemp = Math.round(state.percTemp * 2)/2;
  } else {
    state.percTemp = state.currTemp;
  }

  if (state.percTemp > 80) {
    state.percTemp = 89;
  }

  if (state.enabled) {
    if (state.currTemp > state.desiredTemp) {
      state.cool = true;
    }
    if (state.currTemp < state.desiredTemp) {
      state.warm = true;
    }
  }
  coolSW(state.cool);
  warmSW(state.warm);

}

//Timer.set(5000, Timer.REPEAT, updateSW, null);

// Update state every 10 second, and report to cloud if online
Timer.set(15000, Timer.REPEAT, function () {
  state.timestamp = Math.round(Timer.now());
  updateSW();
  if (online) {
    let res = MQTT.pub(state_topic, JSON.stringify(state), 1, true);
    MQTT.pub(status_topic, "online", 1, true);
  }
}, null);


MQTT.sub(general_topic, function (conn, topic, msg) {
  if (("" + topic) === ("" + settemp_topic)) {
    let temp = JSON.parse(msg);
    if ((temp > -11) && (temp < 46)) {
      state.desiredTemp = temp;
      updateSW();
    }
  }
  else if (("" + topic) === ("" + onoff_topic)) {
    if (msg === "on") {
      state.enabled = true;
      updateSW();
    }
    else if (msg === "off") {
      state.enabled = false;
      updateSW();
    }
    
  }
  else if (("" + topic) === ("" + setname_topic)) {
    state.name = "" + msg;
    updateSW();
  }
  
});


MQTT.setEventHandler(function (conn, ev, edata) {
  if (ev === 202) {
    GPIO.blink(2, 0, 0)
    GPIO.write(2, 1);
    online = true;
    MQTT.pub(status_topic, "online", 1, true);
    updateSW();

  }
  else if (ev === 5) {
    GPIO.blink(2, 0, 0)
    GPIO.write(2, 0);
    online = false;
    state.enabled = false;
    updateSW();
  }
}, null);
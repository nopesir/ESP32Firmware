# Brief description

As part of the chrono-thermostat system, this repository contains the Mongoose OS firmware flashed on the ESP32s. It is able to retrieve the temperature through DHT22 and choose whitch relay has to be enabled.
Furthermore, it is capable of switching into a configuration mode in softAP by pressing the boot button and connecting to the Mongoose_XXXXXX wifi on the IP 192.168.4.1 (it has a light http web server) in order to pass the wifi SSID and password.
In addition, it implements the MQTT protocol, using retained messages in order to have always the current state and last will messages to have a mechanism of automatic online/offline notification.

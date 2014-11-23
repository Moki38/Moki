var express = require('express');
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);
var bmp085 = require('bmp085-sensor');
var bmp = bmp085({address: 0x77,
                     mode: 3,
                     units: 'metric'});
var fs = require('fs');
var dht22 = require('node-dht-sensor');
var dht22_init = false;
var i2c_2relay = require('i2c-2relay');
var relay = i2c_2relay({address: 0x47});
var heater_status;

var mokidata = {
        humidity: 0,
        mbar: 0,
        temp1: 0,
        temp2: 0,
        heater: 'OFF',
  };

/* Server config */
app.set("ipaddr", "10.10.10.6");
app.set("port", 3000);
app.set("views", __dirname + "/views");
app.use(express.static("public", __dirname + "/public"));
app.get("/", function(request, response) {
        res.sendfile('index.html');
});

var dht = {
  initialize: function() {
    this.totalReads = 0;
    return dht22.initialize(22, 4);
  },

  read: function() {
    var readout = dht22.read();
    mokidata.temp1 = readout.temperature.toFixed(1);
    mokidata.humidity = readout.humidity.toFixed(1); 
  }
};

var heater = function(mokidata) {
  if (mokidata.heater == 'ON') {
    relay.set('1');  
  }
  if (mokidata.heater == 'OFF') {
    relay.reset('1');  
  }
};

var read_dht22 = function(mokidata) {
  if (dht.initialize()) {
    dht.read();
    dht22_init = true;
  } else {
    console.warn('Failed to initialize sensor');
  };
};

var read_bmp = function (mokidata) {
  bmp.read(function (err, data) {
  mokidata.temp2 = data.temperature;
  mokidata.mbar = Math.floor(data.pressure);
  });
};

/* Socket.IO events */
io.on('connection', function(socket){
  console.log('connected');

  socket.on('disconnect', function(){
    console.log('disconnected');
    clearInterval(interval);
  });

  socket.on('heater', function(status){
    console.log('heater '+status);
    mokidata.heater = status;
  });

  var interval = setInterval(function () {
     read_bmp(mokidata);
     read_dht22(mokidata);
     if (heater_status != mokidata.heater) {
       heater(mokidata);
       heater_status = mokidata.heater;
     }
     socket.emit("mokidata", mokidata);
  }, 1000);
});

//Start the http server at port and IP defined before
server.listen(app.get("port"), app.get("ipaddr"), function() {
  console.log("Server up and running. Go to http://" + app.get("ipaddr") + ":" + app.get("port"));
});


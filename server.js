var express = require('express');
var shell = require("shelljs");
var app = express();
var path = require('path');
var server = require("http").Server(app);
var io = require("socket.io")(server);

var caminterval = setInterval(function () {
    var camchild = shell.exec('/data/moki/cam.sh', {async:true, silent:true});
  }, 60000);

var rrdinterval = setInterval(function () {
    var rrdchild = shell.exec('/data/moki/rrd/create_graph.sh', {async:true, silent:true});
  }, 300000);

var net = require('net');
var nmea = require('nmea');
var client = net.connect({port: 10110},
    function() { //'connect' listener
});

var options = {
        address: '0x47',
        device: '/dev/i2c-2',
        };

//var device = "/dev/i2c-2"

var bmp085 = require('bmp085');
var barometer = new bmp085({'device': options.device});

var htu21d = require('htu21d');

var address = 0x40;
var hum = new htu21d.Htu21d(options.device, address);

var i2c_2relay = require('i2c-2relay');
//var relay = i2c_2relay({address: 0x47, 'device': device});
var relay = i2c_2relay(options);
var heater_status;

var serialport = require('serialport');

var port = new serialport.SerialPort('/dev/ttySER0', {
                baudrate: 19200,
                parser: serialport.parsers.readline('\r\n')});

var PORT = 32000;
var HOST = '127.0.0.1';

var dgram = require('dgram');
var imuserver = dgram.createSocket('udp4');

var bmvdata = {
        V: 0,
        VS: 0,
        I: 0,
        CE: 0,
        SOC: 0,
        TTG: 0,
        Alarm:   'OFF',
        Relay:   'OFF',
        AR:      0,
        BMV:     '602S',
        FW:      '212',
        H1: 0,
        H2: 0,
        H3: 0,
        H4: 0,
        H5: 0,
        H6: 0,
        H7: 0,
        H8: 0,
        H9: 0,
        H10: 0,
        H11: 0,
        H12: 0,
        H13:0,
        H14: 0,
        H15: 0,
        H16: 0,
        };

var rddtool='/var/www/rrdtool';

var mokidata = {
        humidity: 0,
        mbar: 0,
        temp1: 0,
        temp2: 0,
        V: 0,
        VS: 0,
        CE: 0,
        I: 0,
        TTG: 0,
        SOC: 0,
        Alarm: 0,
        AR: 0,
        Relay: 0,
        heater: 'ON',
        cpu: 0,
        wind_speed: 0,
        wind_angle: 0,
  };

var imudata = {
        time: 0,
        roll: 0,
        pitch: 0,
        yaw: 0,
        status: 0
  };

var interval = setInterval(function () {
     read_bmp(mokidata);
     read_hum(mokidata);
     cputemp(mokidata);
     heater(mokidata);
     update_rrd(mokidata);
  }, 5000);

/* Server config */
app.set("ipaddr", "0.0.0.0");
app.set("port", 80);
app.set("views", __dirname + "/views");
app.use(express.static("public", __dirname + "/public"));
app.use('/rddtool', express.static(rddtool));

app.get("/", function(request, response) {
        res.sendfile('index.html');
});

var heater_init = function() {
  var child = shell.exec('cat /data/moki/heater.stat', {async:true, silent:true});
    child.stdout.on('data', function(data) {
//      console.log('heater_init :'+data);
      if (data == "ON") {
        relay.set('0');  
        mokidata.heater = 'ON';
      } 
      if (data == "OFF") {
        relay.reset('0');  
        mokidata.heater = 'OFF';
      } 
  });
};

var heater_on = function() {
    child = shell.exec('echo \"ON\" > /data/moki/heater.stat', {async:true, silent:true});
    relay.set('0');  
    child = shell.exec('echo \"Heater changed to: ON" | mailx -s \"Moki Boat Heater changed ON\" eric@belni.nl', {async:true, silent:true});
    child = shell.exec('at now+30 /usr/sbin/i2cset -y 2 0x47 0x10 0x00', {async:true, silent:true});
    child = shell.exec('at now+30 echo \"Heater changed to: OFF" | mailx -s \"Moki Boat Heater changed OFF\" eric@belni.nl', {async:true, silent:true});
};

var heater = function(mokidata) {
  var child;
//  console.log('heater :'+mokidata.heater);
  if (mokidata.heater == 'ON') {
    child = shell.exec('echo \"ON\" > /data/moki/heater.stat', {async:true, silent:true});
    relay.set('0');  
  }
  if (mokidata.heater == 'OFF') {
    child = shell.exec('echo \"OFF\" > /data/moki/heater.stat', {async:true, silent:true});
    relay.reset('0');  
  }
};

var update_rrd = function(mokidata) {
    var command;
    var child;
    command = '/data/moki/rrd/update.sh bar '+mokidata.mbar;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh cputemp '+mokidata.cpu;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh hum '+mokidata.humidity;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh temp0 '+mokidata.temp1;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh temp1 '+mokidata.temp2;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh volt0 '+mokidata.V;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh volt1 '+mokidata.VS;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh windspd '+mokidata.wind_speed;
    child = shell.exec(command, {async:true, silent:true});

    if (mokidata.heater == 'ON') {
      command = '/data/moki/rrd/update.sh heater 100';
      child = shell.exec(command, {async:true, silent:true});
    } else {
      command = '/data/moki/rrd/update.sh heater 0';
      child = shell.exec(command, {async:true, silent:true});
    }
//        Alarm: 0,
//        Relay: 0,
};

var cputemp = function(mokidata) {
  var child;
  child = shell.cat('/sys/devices/platform/sunxi-i2c.0/i2c-0/0-0034/temp1_input');
  mokidata.cpu = Math.floor(child/100)/10;
};

var read_bmp = function (mokidata) {
  barometer.read(function (data) {
  mokidata.temp2 = data.temperature;
  if (mokidata.temp2 <= 2) {
     heater_on();
  }
  mokidata.mbar = Math.floor(data.pressure*10)/10;
  });
};

var read_hum = function (mokidata) {
  mokidata.temp1= Math.floor(hum.temperature()*10)/10;
  mokidata.humidity = Math.floor(hum.humidity()*10)/10;
};

var read_bmv600 = function (mokidata) { 
  mokidata.V = Math.floor(bmvdata.V/10)/100;
  mokidata.VS = Math.floor(bmvdata.VS/10)/100;
  mokidata.CE = bmvdata.CE/100;
  mokidata.I = bmvdata.I/100;
  mokidata.SOC = bmvdata.SOC/10;
  mokidata.TTG = bmvdata.TTG;
  mokidata.Alarm = bmvdata.Alarm;
  mokidata.Relay = bmvdata.Relay;
  mokidata.AR = bmvdata.AR;
};

imuserver.on('listening', function () {
    var address = imuserver.address();
//    console.log('Listening for IMU data on: ' + address.address + ":" + address.port);
});

imuserver.on('message', function (message, remote) {
    imustring = message.toString().split(' ');

    for(var i=0; i<imustring.length;i++) imustring[i] = +imustring[i];

    imudata.time   = imustring[0];
    imudata.roll   = +imustring[1].toFixed(2);
    imudata.pitch  = +imustring[2].toFixed(2);
    imudata.yaw    = +imustring[3].toFixed(2);
    if (new Date().getTime() - imudata.time < 15) {
       imudata.status = 'OK';
    } else {
       imudata.status = 'NOK';
    }
    if (imudata.roll < 0) {
	    mokidata.roll = imudata.roll + 360;
    } else {
	    mokidata.roll = imudata.roll;
    }
    if (imudata.pitch < 0) {
        mokidata.pitch = imudata.pitch + 360;
    } else {
        mokidata.pitch = imudata.pitch;
    }
    if (imudata.yaw < 0) {
        mokidata.yaw = imudata.yaw + 360;
    } else {
        mokidata.yaw = imudata.yaw;
    }
    mokidata.status = imudata.status;

//    console.log(imudata);
});

port.on('data', function(line) {
//    console.log(line);
    var res = line.split("\t");
//    console.log(res[0]+" = "+res[1]);
        switch(res[0]) {
        case    'V':
                        bmvdata.V = res[1];
//                console.log("V = "+bmvdata.V);
                        break;
        case    'VS':
                        bmvdata.VS = res[1];
//                console.log("VS = "+bmvdata.VS);
                        break;
        case    'I':
                        bmvdata.I = res[1];
                        break;
        case    'CE':
                        bmvdata.CE = res[1];
                        break;
        case    'SOC':
                        bmvdata.SOC = res[1];
                        break;
        case    'TTG':
                        bmvdata.TTG = res[1];
                        break;
        case    'Alarm':
                        bmvdata.Alarm = res[1];
                        break;
        case    'Relay':
                        bmvdata.Relay = res[1];
                        break;
        case    'AR':
                        bmvdata.AR = res[1];
                        break;
        case    'BMV':
                        bmvdata.BMV = res[1];
                        break;
        case    'FW':
                        bmvdata.FW = res[1];
                        break;
        case    'H1':
                        bmvdata.H1 = res[1];
                        break;
        case    'H2':
                        bmvdata.H2 = res[1];
                        break;
        case    'H3':
                        bmvdata.H3 = res[1];
                        break;
        case    'H4':
                        bmvdata.H4 = res[1];
                        break;
        case    'H5':
                        bmvdata.H5 = res[1];
                        break;
        case    'H6':
                        bmvdata.H6 = res[1];
                        break;
        case    'H7':
                        bmvdata.H7 = res[1];
                        break;
        case    'H8':
                        bmvdata.H8 = res[1];
                        break;
        case    'H9':
                        bmvdata.H9 = res[1];
                        break;
        case    'H10':
                        bmvdata.H10 = res[1];
                        break;
        case    'H11':
                        bmvdata.H11 = res[1];
                        break;
        case    'H12':
                        bmvdata.H12 = res[1];
                        break;
        case    'H13':
                        bmvdata.H13 = res[1];
                        break;
        case    'H14':
                        bmvdata.H14 = res[1];
                        break;
        case    'H15':
                        bmvdata.H15 = res[1];
                        break;
        case    'H16':
                        bmvdata.H16 = res[1];
                        break;
        case    'Checksum':
                        break;
                default:
        //                console.log(line);
                        break;
        }
});


/* Socket.IO events */
io.on('connection', function(socket){
    var clientIp = socket.request.connection.remoteAddress
    console.log('New connection from: '+clientIp)

  read_bmp(mokidata);
  read_hum(mokidata);
  read_bmv600(mokidata);
  cputemp(mokidata);
  heater(mokidata);
  socket.emit("mokidata", mokidata);

  socket.on('disconnect', function(){
    console.log('disconnected');
    clearInterval(interval);
  });

  socket.on('heater', function(status){
    mokidata.heater = status;
  });
  socket.emit("mokidata", mokidata);

});

heater_init();


client.on('data', function(line) {
  d = nmea.parse(line.toString());
  sentence = d.sentence;
  switch(sentence) {
    case 'RMC':
                break;
    case 'DBT':
//                console.log('Depth = %d',d.depthMeters);
                break;
    case 'HDG':
//                console.log('Heading = %d',d.heading);
                break;
    case 'MWV':
		mokidata.wind_speed = d.speed;
		mokidata.wind_angle = d.angle;
//                console.log('Wind Speed = %d',d.speed);
//                console.log('Wind Angle = %d',d.angle);
                break;
    case 'MTW':
//                console.log('Water Temp = %d',d.degrees);
                break;
    case 'VHW':
//                console.log('Speed Knots = %d',d.speed_n);
                break;
    case 'TXT':
                break;
    case 'VDM':
                break;
    case 'VDO':
                break;
    case 'GBS':
                break;
    default:
                console.log(d);
                break;
  }
});
client.on('end', function() {
  console.log('disconnected from server');
});

imuserver.bind(PORT, HOST);

//Start the http server at port and IP defined before
server.listen(app.get("port"), app.get("ipaddr"), function() {
  console.log("Server up and running. Go to http://" + app.get("ipaddr") + ":" + app.get("port"));
});


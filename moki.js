var express = require('express');
var app = express();
var path = require('path');
var packagejson = require('prettyjson');
var request = require('request');
var term = require( 'terminal-kit' ).terminal;
var shell = require("shelljs");
var truewind = require('true-wind');
var json2html = require('node-json2html');
var transform = {'tag':'li','html':'TEMP = ${temp1} HEATER = ${heater}'};
var server = require("http").Server(app);
var io = require("socket.io")(server);

shell.exec('/bin/chvt 7', {async:true, silent:true});

try {
    var config = require('./config');
} catch (err) {
    console.log("Missing or corrupted config file.");
    console.log("Have a look at config.js.example if you need an example.");
    console.log("Error: "+err);
    process.exit(-1);
}

var rrdinterval = setInterval(function () {
    var rrdchild = shell.exec('/data/moki/rrd/create_graph.sh', {async:true, silent:true});
  }, 300000);

function prettyFloat(x,nbDec) { 
    if (!nbDec) nbDec = 100;
    var a = Math.abs(x);
    var e = Math.floor(a);
    var d = Math.round((a-e)*nbDec); if (d == nbDec) { d=0; e++; }
    var signStr = (x<0) ? "-" : " ";
    var decStr = d.toString(); var tmp = 10; while(tmp<nbDec && d*tmp < nbDec) {decStr = "0"+decStr; tmp*=10;}
    var eStr = e.toString();
    return signStr+eStr+"."+decStr;
}

var jsonPrettyPrint = {
   replacer: function(match, pIndent, pKey, pVal, pEnd) {
      var key = '<span style="color:brown">';
      var val = '<span style="color:navy">';
      var str = '<span style="color:green">';
      var r = pIndent || '';
      if (pIndent)
         r = r + '<li>';
      if (pKey)
         //r = r + key + pKey.replace(/[": ]/g, '') + '</span>: ';
         r = r + key + pKey.replace(/[": ]/g, '') + '</span>: ';
      if (pVal)
         r = r + (pVal[0] == '"' ? str : val) + pVal + '</span>';
      if (pEnd)
         r = r + (pEnd || '</li>');
//         r = r + '</li>';
      return r;
      },
   toHtml: function(obj) {
      var jsonLine = /^( *)("[\w]+": )?("[^"]*"|[\w.+-]*)?([,[{])?$/mg;
      return JSON.stringify(obj, null, 3)
         .replace(/&/g, '&amp;').replace(/\\"/g, '&quot;')
         .replace(/</g, '&lt;').replace(/>/g, '&gt;')
         .replace(jsonLine, jsonPrettyPrint.replacer);
      }
   };
var ops = {
  speed: 6.5, heading: 200, awd: 350, aws: 5
};

var apikey = '96096921A9464611A02E0E024398E996';
var octohttp = 'http://localhost:5000';

var octo_options = {
  url: octohttp+'/api/printer?exclude=temperature,sd',
  headers: {
    'X-Api-Key': apikey
  }
};
var octo_options2= {
  url: octohttp+'/api/job',
  headers: {
    'X-Api-Key': apikey
  }
};

var octo_data = {
        status: 'unknown',
        operational: 0,
        error: 0,
        ready: 0,
        complete: 0
};

function octo_callback(error, response, body) {
  if (!error && response.statusCode == 200) {
    var info = JSON.parse(body);
    //console.log(info.state.flags.ready);
    //console.log(info.state);
    octo_data.status = info.state.text;
    octo_data.ready = info.state.flags.ready;
    octo_data.operational = info.state.flags.operational;
    octo_data.error = info.state.flags.error;
  }
}

function octo_callback2(error, response, body) {
  if (!error && response.statusCode == 200) {
    var info = JSON.parse(body);
    octo_data.complete = Math.floor(info.progress.completion);
  }
}


var options = {
        address: '0x47',
        device: '/dev/i2c-1',
        };

//var i2c_2relay = require('i2c-2relay');
//var relay = i2c_2relay({address: 0x47, 'device': device});
//var relay = i2c_2relay(options);

var heater_status;

//
// 
//

var SerialPort = require('serialport');

//
// BMV
//
// House / Start
var port0 = new SerialPort('/dev/ttyBMV0', {
                baudrate: 19200,
                parser: SerialPort.parsers.readline('\r\n')});
// Solar MPPT
var port1 = new SerialPort('/dev/ttyUSB2', {
                baudrate: 19200,
                parser: SerialPort.parsers.readline('\r\n')});
// Boegschroef
var port2 = new SerialPort('/dev/ttyUSB0', {
                baudrate: 19200,
                parser: SerialPort.parsers.readline('\r\n')});

//
// Init 
//
//bmpoptions = {
//   'debug' : false,
//   'address' : 0x77,
//   'device' : '/dev/i2c-1',
//   'mode' : 1
// };

var bmp085 = require('bmp085');
var barometer = new bmp085({address: 0x77, 'device': options.device});

var i2c_htu21d = require('htu21d-i2c');
var htu21d = new i2c_htu21d({device: '/dev/i2c-1'});
//var address = 0x40;

//
//
//

var data_last = new Date();
var data_now = new Date();
var net = require('net');
var nmea = require('nmea');

//
//
//
var PORT = 32000;
var HOST = '127.0.0.1';

var dgram = require('dgram');
var imuserver = dgram.createSocket('udp4');

var bmv0data = {
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

var bmv1data = {
        VPV: 0,
        PPV: 0,
        I: 0,
        CS: 0,
        YT: 0,
        YY: 0,
        PT: 0,
        PY: 0,
        };

var bmv2data = {
        V: 0,
        };

var rddtool='/var/www/rrdtool';

var mokidata = {
        humidity: 'N/A',
        mbar: 0,
        mbarout: 0,
        temp1: 'N/A',
        temp2: 0,
        V: 0,
        VS: 0,
        VB: 0,
        CE: 0,
        I: 0,
        TTG: 0,
        SOC: 0,
        Alarm: 0,
        AR: 0,
        Relay: 0,
        VPV: 0,
        PPV: 0,
        CS: 0,
        YT: 0,
        YY: 0,
        PT: 0,
        PY: 0,
        heater: 'OFF',
        cpu: 0,
        wind_speed: 0,
        true_wind_angle: 0,
        true_wind_dir: 'N',
        app_wind_angle: 0,
        heading: 0,
        depth: 0,
        speed: 0,
        DSL: 'N/A',
        WAS: 'N/A',
        WVS: 'N/A',
  };

var imudata = {
        time: 0,
        roll: 0,
        pitch: 0,
        yaw: 0,
        status: 0
  };

function prettyJSON(data) {
    return JSON.stringify(data, null, "\t");
}

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

var sensorinterval = setInterval(function () {
    // console.log("sensorinterval");
     read_bmp(mokidata);
     sleep(500);
     read_hum(mokidata);
     cputemp(mokidata);
     read_bmv600(mokidata);
     heater(mokidata);
     update_rrd(mokidata);
  }, 1000);

var heater_init = function() {
  var out = shell.cat('/data/moki/heater.stat');
  var tijd = Date();

//      console.log('heater_init :'+out+' on '+tijd);
      if (out == "ON\n") {
  //      relay.set('0');
        mokidata.heater = 'ON';
      }
      if (out == "OFF\n") {
   //     relay.reset('0');
        mokidata.heater = 'OFF';
      }
};

var heater_on = function() {
    child = shell.exec('echo \"ON\" > /data/moki/heater.stat', {async:true, silent:true});
    // relay.set('0');
    child = shell.exec('echo \"Heater changed to: ON" | mailx -s \"Moki Boat Heater changed ON\" eric@belni.nl', {async:true, silent:true});
    child = shell.exec('at now+30 /usr/sbin/i2cset -y 2 0x47 0x10 0x00', {async:true, silent:true});
    child = shell.exec('at now+30 echo \"Heater changed to: OFF" | mailx -s \"Moki Boat Heater changed OFF\" eric@belni.nl', {async:true, silent:true});
};

var heater = function(mokidata) {
  var child;
  if (mokidata.heater == 'ON') {
    child = shell.exec('echo \"ON\" > /data/moki/heater.stat', {async:true, silent:true});
    // relay.set('0');
//    child = shell.exec('echo \"Heater changed to: ON" | mailx -s \"Moki Boat Heater changed ON\" eric@belni.nl', {async:true, silent:true});
  } else {
    child = shell.exec('echo \"OFF\" > /data/moki/heater.stat', {async:true, silent:true});
    // relay.reset('0');
//    child = shell.exec('echo \"Heater changed to: OFF" | mailx -s \"Moki Boat Heater changed OFF\" eric@belni.nl', {async:true, silent:true});
  }
};

function heater_display() {
  term.moveTo(0,0);
  term.bgBlue();
  term.yellow('                    \n');
  term.brightYellow('       HEATER       \n');
  term.yellow('                    \n');
  heater_init(mokidata);
  if (mokidata.heater == 'ON') {
    term.green('         ON         \n');
  } else {
    term.red('         OFF        \n');
  }
  term.yellow('                    \n');

  term.bgDefaultColor();
}

function moki_display() {
  term.brightWhite();
  term.bgBlue();
  term.moveTo(45,1,' #   #  ##  #  # # ');
  term.moveTo(45,2,' ## ## #  # # #    ');
  term.moveTo(45,3,' # # # #  # ##   # ');
  term.moveTo(45,4,' #   # #  # # #  # ');
  term.moveTo(45,5,' #   #  ##  #  # # ');

  term.defaultColor();
  term.bgDefaultColor();
}
function nmea_display() {
   data_now = new Date();
   if (data_now - data_last > 1000 ) {
     term.moveTo( 3 , 7 , "                    ") ;
     term.moveTo( 3 , 8 , "                    ") ;
     term.moveTo( 3 , 9 , "                    ") ;
     term.moveTo( 3 ,10 , "                    ") ;
     term.moveTo( 3 ,11 , "                    ") ;
     term.moveTo( 3 ,12 , "                    ") ;
     term.moveTo( 3 ,13 , "                    ") ;
  } else {
     term.moveTo( 3 , 7 , "Wind Speed: %f  " , mokidata.wind_speed ) ;
     term.moveTo( 3 , 8 , "Wind Angle: %f  " , mokidata.app_wind_angle ) ;
     term.moveTo( 3 , 9 , "Wind True : %f    " , mokidata.true_wind_angle ) ;
     term.moveTo( 3, 10 , "Wind Dir  : %s  " , mokidata.true_wind_dir ) ;
     term.moveTo( 3, 11 , "Heading   : %f  " , mokidata.heading ) ;
     term.moveTo( 3, 12 , "Speed     : %f  " , mokidata.speed ) ;
     term.moveTo( 3, 13 , "Depth     : %f  " , mokidata.depth ) ;
  }
}

function bmv_display() {
//  if (shell.test('-L', '/dev/ttyUSB0')) {
     if (mokidata.AR != 0) {
         term.moveTo( 24 , 6 , "Accu Alarm: ") ;
         term.brightRed( mokidata.AR ) ;
//Low Voltage 1 High Voltage 2 Low SOC 4 Low Starter Voltage 8 High Starter Voltage 16 Low Temperature 32 High Temperature 64 Mid Voltage 128 E
     } else {
         term.moveTo( 24 , 6 , "                  ") ;
     }

     if (mokidata.V >= 15) {
         term.moveTo( 24 , 6 ) ;
         term.brightRed( "Accu Alarm: High Voltage" ) ;
//Low Voltage 1 High Voltage 2 Low SOC 4 Low Starter Voltage 8 High Starter Voltage 16 Low Temperature 32 High Temperature 64 Mid Voltage 128 E
     } else {
         term.moveTo( 24 , 6 , "                  ") ;
     }

     term.moveTo( 24 , 7 , "                  ") ;
     term.moveTo( 24 , 7 , "House Accu:") ;
     if (mokidata.I == 0) {
         term.blue(prettyFloat(mokidata.V)) ;
     }
     if (mokidata.I < 0) {
         term.yellow(prettyFloat(mokidata.V)) ;
     }
     if (mokidata.I > 0) {
         term.green(prettyFloat(mokidata.V)) ;
     }
     term.moveTo( 24 , 8 , "                  ") ;
     term.moveTo( 24 , 8 , "House I   :") ;
     if (mokidata.I == 0) {
         term.blue(prettyFloat(mokidata.I)) ;
     }
     if (mokidata.I < 0) {
         term.yellow(prettyFloat(mokidata.I)) ;
     }
     if (mokidata.I > 0) {
         term.green(prettyFloat(mokidata.I)) ;
     }
     term.moveTo( 24 , 9 , "                  ") ;
     term.moveTo( 24 , 9 , "House SOC :") ;
     if (mokidata.I == 0) {
         term.blue(prettyFloat(mokidata.SOC)) ;
     }
     if (mokidata.I < 0) {
         term.yellow(prettyFloat(mokidata.SOC)) ;
     }
     if (mokidata.I > 0) {
         term.green(prettyFloat(mokidata.SOC)) ;
     }
     term.moveTo( 24 ,10 , "Start Accu: %f  " , prettyFloat(mokidata.VS) ) ;
     term.moveTo( 24 ,11 , "BoegS Accu: %f  " , prettyFloat(mokidata.VB) ) ;

     term.moveTo( 24 ,13 , "                  ") ;
     term.moveTo( 24 ,13 , "Panel Volt:" ) ;
     if (mokidata.I2 == 0) {
         term.blue(prettyFloat(mokidata.VPV)) ;
     }
     if (mokidata.I2 < 0) {
         term.yellow(prettyFloat(mokidata.VPV)) ;
     }
     if (mokidata.I2 > 0) {
         term.green(prettyFloat(mokidata.VPV)) ;
     }


     term.moveTo( 24 ,14 , "Panel Watt: %f  " , mokidata.PPV ) ;
     term.moveTo( 24 ,15 , "Panel CS  : ") ;
     switch(mokidata.CS) {
     case    '0':
         term.blue( "OFF  " ) ;
         break;
     case    '2':
         term.red( "Fault" ) ;
         break;
     case    '3':
         term.green( "Bulk " ) ;
         break;
     case    '4':
         term.green( "Absob" ) ;
         break;
     case    '5':
         term.green( "Float" ) ;
         break;
        }
//     term.moveTo( 24 ,13 , "Panel CS  : %f  " , mokidata.CS ) ;
     term.moveTo( 24 ,16 , "Yield Tday: %f  " , mokidata.YT ) ;
     term.moveTo( 24 ,17 , "Yield Yday: %f  " , mokidata.YY ) ;
//  } else {
     //term.moveTo( 24 , 7 , "                ") ;
     //term.moveTo( 24 , 8 , "                ") ;
     //term.moveTo( 24 , 9 , "                ") ;
     //term.moveTo( 24 ,10 , "                ") ;
     //term.moveTo( 24 ,11 , "                ") ;
     //term.moveTo( 24 ,12 , "                ") ;
     //term.moveTo( 24 ,13 , "                ") ;
     //term.moveTo( 24 ,14 , "                ") ;
     //term.moveTo( 24 ,15 , "                ") ;
     //term.moveTo( 24 ,16 , "                ") ;
     //term.moveTo( 24 ,17 , "                ") ;
  //}
}

function octo_display() {
  if (shell.test('-L', '/dev/ttyK8400')) {
    request(octo_options, octo_callback);
    request(octo_options2, octo_callback2);
    term.brightWhite();
    term.bgBlue();
    term.moveTo(24,1,'    3D Printer     ');
    term.moveTo(24,2,'    Status :       ');
    term.moveTo(24,3,'                   ');
    term.moveTo(31,3,octo_data.status);
    term.moveTo(24,4,'                   ');
    term.moveTo(24,4,'   Complete: '+octo_data.complete+'\% ');
    term.moveTo(24,5,'                   ');

    term.defaultColor();
    term.bgDefaultColor();
  } else {
    term.brightWhite();
    term.bgDefaultColor();

    hours = new Date().getHours();
    minutes = new Date().getMinutes();
    switch(Math.floor(hours/10)){
        case 0:
    		term.moveTo(24,2,' _ ');
    		term.moveTo(24,3,'| |');
    		term.moveTo(24,4,'|_|');
                break;
        case 1:
    		term.moveTo(24,2,'   ');
    		term.moveTo(24,3,'  |');
    		term.moveTo(24,4,'  |');
                break;
        case 2:
    		term.moveTo(24,2,' _ ');
    		term.moveTo(24,3,' _|');
    		term.moveTo(24,4,'|_ ');
                break;
    }
    switch(hours-(Math.floor(hours/10)*10)){
        case 0:
    		term.moveTo(28,2,' _ ');
    		term.moveTo(28,3,'| |');
    		term.moveTo(28,4,'|_|');
                break;
        case 1:
    		term.moveTo(28,2,'   ');
    		term.moveTo(28,3,'  |');
    		term.moveTo(28,4,'  |');
                break;
        case 2:
    		term.moveTo(28,2,' _ ');
    		term.moveTo(28,3,' _|');
    		term.moveTo(28,4,'|_ ');
                break;
        case 3:
    		term.moveTo(28,2,' _ ');
    		term.moveTo(28,3,' _|');
    		term.moveTo(28,4,' _|');
                break;
        case 4:
    		term.moveTo(28,2,'   ');
    		term.moveTo(28,3,'|_|');
    		term.moveTo(28,4,'  |');
                break;
        case 5:
    		term.moveTo(28,2,' _ ');
    		term.moveTo(28,3,'|_ ');
    		term.moveTo(28,4,' _|');
                break;
        case 6:
    		term.moveTo(28,2,' _ ');
    		term.moveTo(28,3,'|_ ');
    		term.moveTo(28,4,'|_|');
                break;
        case 7:
    		term.moveTo(28,2,' _ ');
    		term.moveTo(28,3,'  |');
    		term.moveTo(28,4,'  |');
                break;
        case 8:
    		term.moveTo(28,2,' _ ');
    		term.moveTo(28,3,'|_|');
    		term.moveTo(28,4,'|_|');
                break;
        case 9:
    		term.moveTo(28,2,' _ ');
    		term.moveTo(28,3,'|_|');
    		term.moveTo(28,4,' _|');
                break;
    }
    	term.moveTo(32,3,'o');
    	term.moveTo(32,4,'o');
    switch(Math.floor(minutes/10)){
        case 0:
    		term.moveTo(34,2,' _ ');
    		term.moveTo(34,3,'| |');
    		term.moveTo(34,4,'|_|');
                break;
        case 1:
    		term.moveTo(34,2,'   ');
    		term.moveTo(34,3,'  |');
    		term.moveTo(34,4,'  |');
                break;
        case 2:
    		term.moveTo(34,2,' _ ');
    		term.moveTo(34,3,' _|');
    		term.moveTo(34,4,'|_ ');
                break;
        case 3:
    		term.moveTo(34,2,' _ ');
    		term.moveTo(34,3,' _|');
    		term.moveTo(34,4,' _|');
                break;
        case 4:
    		term.moveTo(34,2,'   ');
    		term.moveTo(34,3,'|_|');
    		term.moveTo(34,4,'  |');
                break;
        case 5:
    		term.moveTo(34,2,' _ ');
    		term.moveTo(34,3,'|_ ');
    		term.moveTo(34,4,' _|');
                break;
      }
    switch(minutes-(Math.floor(minutes/10)*10)){
        case 0:
    		term.moveTo(38,2,' _ ');
    		term.moveTo(38,3,'| |');
    		term.moveTo(38,4,'|_|');
                break;
        case 1:
    		term.moveTo(38,2,'   ');
    		term.moveTo(38,3,'  |');
    		term.moveTo(38,4,'  |');
                break;
        case 2:
    		term.moveTo(38,2,' _ ');
    		term.moveTo(38,3,' _|');
    		term.moveTo(38,4,'|_ ');
                break;
        case 3:
    		term.moveTo(38,2,' _ ');
    		term.moveTo(38,3,' _|');
    		term.moveTo(38,4,' _|');
                break;
        case 4:
    		term.moveTo(38,2,'   ');
    		term.moveTo(38,3,'|_|');
    		term.moveTo(38,4,'  |');
                break;
        case 5:
    		term.moveTo(38,2,' _ ');
    		term.moveTo(38,3,'|_ ');
    		term.moveTo(38,4,' _|');
                break;
        case 6:
    		term.moveTo(38,2,' _ ');
    		term.moveTo(38,3,'|_ ');
    		term.moveTo(38,4,'|_|');
                break;
        case 7:
    		term.moveTo(38,2,' _ ');
    		term.moveTo(38,3,'  |');
    		term.moveTo(38,4,'  |');
                break;
        case 8:
    		term.moveTo(38,2,' _ ');
    		term.moveTo(38,3,'|_|');
    		term.moveTo(38,4,'|_|');
                break;
        case 9:
    		term.moveTo(38,2,' _ ');
    		term.moveTo(38,3,'|_|');
    		term.moveTo(38,4,' _|');
                break;
    }
//    term.moveTo(24,1,'                   ');
//    term.moveTo(24,2,'                   ');
//    term.moveTo(24,3,'                   ');
//    term.moveTo(24,4,'                   ');
//    term.moveTo(24,5,'                   ');
    term.defaultColor();
  }
}

var update_rrd = function(mokidata) {
    var command;
    var child;
    command = '/data/moki/rrd/update.sh cputemp '+mokidata.cpu;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh mbar '+mokidata.mbar;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh hum '+mokidata.humidity;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh temp1 '+mokidata.temp1;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh temp2 '+mokidata.temp2;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh bmv_v '+mokidata.V;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh bmv_i '+mokidata.I;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh bmv_vs '+mokidata.VS;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh bmv_vb '+mokidata.VB;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh bmv_soc '+mokidata.SOC;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh solar_i '+mokidata.I2;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh solar_cs '+mokidata.CS;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh solar_ppv '+mokidata.PPV;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh solar_pt '+mokidata.PT;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh solar_py '+mokidata.PY;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh solar_vpv '+mokidata.VPV;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh solar_yt '+mokidata.YT;
    child = shell.exec(command, {async:true, silent:true});
    command = '/data/moki/rrd/update.sh solar_yy '+mokidata.YY;
    child = shell.exec(command, {async:true, silent:true});
};

var cputemp = function(mokidata) {
  var child;
  child = shell.cat('/sys/class/thermal/thermal_zone0/temp');
//  child = shell.cat('/sys/devices/platform/sunxi-i2c.0/i2c-0/0-0034/temp1_input');
  mokidata.cpu = Math.floor(child/100)/10;
};

var read_bmp = function (mokidata) {
  var mbarout;
  barometer.read(function (data) {
  mokidata.temp2 = data.temperature;
  if (mokidata.temp2 <= 2) {
     heater_on();
  }
  mbarout = shell.exec('/data/moki/rrd/read_mbar.sh', {silent:true}).stdout;
  mokidata.mbarout = Math.floor(mbarout*10)/10;
  mokidata.mbar = Math.floor(data.pressure*10)/10;
  });
};

var read_hum = function (mokidata) {
  htu21d.readTemperature(function (temp) {
  mokidata.temp1 = Math.floor(temp*10)/10;

//  mokidata.temp1= Math.floor(htu21d.readTemperature()*10)/10;
    htu21d.readHumidity(function (hum) {
    mokidata.humidity = Math.floor(hum*10)/10;
  });
//  mokidata.humidity = Math.floor(htu21d.readHumidity()*10)/10;
  });
};

var read_bmv600 = function (mokidata) {
  mokidata.V = Math.floor(bmv0data.V/10)/100;
  mokidata.VS = Math.floor(bmv0data.VS/10)/100;
  mokidata.VB = Math.floor(bmv2data.V/10)/100;
  mokidata.VPV = Math.floor(bmv1data.VPV/10)/100;
  mokidata.YT = Math.floor(bmv1data.YT);
  mokidata.PY = Math.floor(bmv1data.YY);
  mokidata.PT = Math.floor(bmv1data.YT);
  mokidata.YY = Math.floor(bmv1data.YY);
  mokidata.PPV = bmv1data.PPV;
  mokidata.CS = bmv1data.CS;
  mokidata.CE = bmv0data.CE/100;
  mokidata.I = Math.floor(bmv0data.I/1000);
  mokidata.I2 = Math.floor(bmv1data.I/1000);
  mokidata.SOC = bmv0data.SOC/10;
  mokidata.TTG = bmv0data.TTG;
  mokidata.Alarm = bmv0data.Alarm;
  mokidata.Relay = bmv0data.Relay;
  mokidata.AR = bmv0data.AR;
};

port0.on('data', function(line) {
//    console.log(line);
    var res = line.split("\t");
//    console.log(res[0]+" = "+res[1]);
        switch(res[0]) {
        case    'V':
                        bmv0data.V = res[1];
//                console.log("V = "+bmv0data.V);
                        break;
        case    'VS':
                        bmv0data.VS = res[1];
//                console.log("VS = "+bmv0data.VS);
                        break;
        case    'I':
                        bmv0data.I = res[1];
                        break;
        case    'CE':
                        bmv0data.CE = res[1];
                        break;
        case    'SOC':
                        bmv0data.SOC = res[1];
                        break;
        case    'TTG':
                        bmv0data.TTG = res[1];
                        break;
        case    'Alarm':
                        bmv0data.Alarm = res[1];
                        break;
        case    'Relay':
                        bmv0data.Relay = res[1];
                        break;
        case    'AR':
                        bmv0data.AR = res[1];
                        break;
        case    'BMV':
                        bmv0data.BMV = res[1];
                        break;
        case    'FW':
                        bmv0data.FW = res[1];
                        break;
        case    'H1':
                        bmv0data.H1 = res[1];
                        break;
        case    'H2':
                        bmv0data.H2 = res[1];
                        break;
        case    'H3':
                        bmv0data.H3 = res[1];
                        break;
        case    'H4':
                        bmv0data.H4 = res[1];
                        break;
        case    'H5':
                        bmv0data.H5 = res[1];
                        break;
        case    'H6':
                        bmv0data.H6 = res[1];
                        break;
        case    'H7':
                        bmv0data.H7 = res[1];
                        break;
        case    'H8':
                        bmv0data.H8 = res[1];
                        break;
        case    'H9':
                        bmv0data.H9 = res[1];
                        break;
        case    'H10':
                        bmv0data.H10 = res[1];
                        break;
        case    'H11':
                        bmv0data.H11 = res[1];
                        break;
        case    'H12':
                        bmv0data.H12 = res[1];
                        break;
        case    'H13':
                        bmv0data.H13 = res[1];
                        break;
        case    'H14':
                        bmv0data.H14 = res[1];
                        break;
        case    'H15':
                        bmv0data.H15 = res[1];
                        break;
        case    'H16':
                        bmv0data.H16 = res[1];
                        break;
        case    'Checksum':
                        break;
                default:
//                         console.log('port0: %s', line);
//                       console.log(line);
                        break;
        }
});

port1.on('data', function(line) {
//    console.log(line);
    var res = line.split("\t");
//    console.log(res[0]+" = "+res[1]);
        switch(res[0]) {
        case    'VPV':
                        bmv1data.VPV = res[1];
                        break;
        case    'I':
                        bmv1data.I = res[1];
                        break;
        case    'PPV':
                        bmv1data.PPV = res[1];
                        break;
        case    'CS':
                        bmv1data.CS = res[1];
                        break;
        case    'H20':
                        bmv1data.YT = res[1];
                        break;
        case    'H22':
                        bmv1data.YY = res[1];
                        break;
        case    'H21':
                        bmv1data.PT = res[1];
                        break;
        case    'H23':
                        bmv1data.PY = res[1];
                        break;
                default:
 //                       console.log('port1: %s', line);
                        //console.log(line);
                        break;
        }
});

port2.on('data', function(line) {
//    console.log(line);
    var res = line.split("\t");
//    console.log(res[0]+" = "+res[1]);
        switch(res[0]) {
        case    'V':
                        bmv2data.V = res[1];
                        break;
                default:
//                         console.log('port2: %s', line);
                        break;
        }
});

/* Server config */
app.listen(80);
app.set("ipaddr", "0.0.0.0");
app.set("port", 80);
//#app.set("views", __dirname + "/views");
//app.use(express.static("public", __dirname + "/public"));
app.use('/', express.static(__dirname + '/public'));
//#app.use('/rddtool', express.static(rddtool));

app.get('/', function (req, res) {
        res.sendfile('index.html');
//       res.status(200).send(json2html.transform(mokidata,transform));
})
app.get('/mokidata', function (req, res) {
       res.status(200).send(jsonPrettyPrint.toHtml(mokidata));
})
app.get('/mokidata2', function (req, res) {
       res.status(200).set({'Content-Type': 'application/json; charset=utf-8'}).send(prettyJSON(mokidata));
// res.status(200).send(jsonPrettyPrint.toHtml(mokidata));
//       res.status(200).send(json2html.transform(mokidata,transform));
})
app.get('/heater_off', function (req, res) {
       mokidata.heater = 'OFF'
       heater(mokidata);
       res.status(200).set({'Content-Type': 'application/json; charset=utf-8'}).send(prettyJSON(mokidata));
})
app.get('/heater_on', function (req, res) {
       mokidata.heater = 'ON'
       heater(mokidata);
       res.status(200).set({'Content-Type': 'application/json; charset=utf-8'}).send(prettyJSON(mokidata));
})

function terminate()
{
    term.grabInput( false ) ;
    setTimeout( function() { process.exit() } , 100 ) ;
}

term.clear();

/* Socket.IO events */
io.on('connection', function(socket){
    var clientIp = socket.request.connection.remoteAddress
//    console.log('New connection from: '+clientIp)

  socket.emit("mokidata", mokidata);

  socket.on('disconnect', function(){
    console.log('disconnected');
//    clearInterval(interval);
  });

  socket.on('heater', function(status){
    mokidata.heater = status;
  });
  socket.emit("mokidata", mokidata);

});

heater_init(mokidata);

//var server = app.listen(80, function () {
//var server = app.listen(80);
//app.listen(80);

//  var host = server.address().address
//  var port = server.address().port

//})

var displayinterval = setInterval(function () {
     heater_display();
     octo_display();
     moki_display();
//     term.moveTo( 10 , 18 , "%s" , Date() ) ;
     term.moveTo( 45 , 7 , "CPU Temp  : ") ;
       if (mokidata.cpu < 30 ) {
         term.blue( "%f  " , mokidata.cpu ) ;
       }
       if ((mokidata.cpu >= 30 ) && (mokidata.cpu <= 70 )) {
         term.green( "%f  " , mokidata.cpu ) ;
       }
       if (mokidata.cpu > 70 ) {
         term.red( "%f  " , mokidata.cpu ) ;
       }

     bmv_display();


     term.moveTo( 45 ,  9 , "Humidity : %f  " , mokidata.humidity ) ;
     term.moveTo( 45 , 10 , "Mbar     : ") ;
       if ((Math.abs(mokidata.mbar - mokidata.mbarout ) < 3) || (mokidata.mbarout < 900)) {
         term.blue( "%f  " , mokidata.mbar ) ;
       } else {
         if (mokidata.mbar < mokidata.mbarout) {
           term.red( "%f  " , mokidata.mbar ) ;
         } else {
           term.green( "%f  " , mokidata.mbar ) ;
         }
       }
//     term.moveTo( 45 , 13 , "Mbar     : %f  " , mokidata.mbar ) ;
     term.moveTo( 45 , 11 , "Temp1    : %f  " , mokidata.temp1 ) ;
     term.moveTo( 45 , 12 , "Temp2    : %f  " , mokidata.temp2 ) ;

     term.moveTo( 45 , 14 , "DSL Tank : %s  " , mokidata.DSL ) ;
     term.moveTo( 45 , 15 , "WVS Tank : %s  " , mokidata.WVS ) ;
     term.moveTo( 45 , 16 , "WAS Tank : %s  " , mokidata.WAS ) ;

     //nmea_display();
     
     term.moveTo( 0 , 18 , "") ;

  }, 500);

 
//term.bold.cyan( 'Type anything on the keyboard...\n' ) ;
//term.green( 'Hit CTRL-C to quit.\n\n' ) ;
 
//term.grabInput( { mouse: 'button' } ) ;
term.grabInput( { mouse: 'motion', focus: true } ) ;
//term.grabInput( { mouse: 'button', focus: true } ) ;
 
term.on( 'key' , function( name , matches , data ) {
    term.moveTo( 1 , 15 , "Keyboard event %s, %s.\n" , name , data ) ;
//    console.log( "'key' event:" , name ) ;
    if ( matches.indexOf( 'CTRL_C' ) >= 0 ) {
      term.green( 'CTRL-C received...\n' ) ;
      shell.exec('/bin/chvt 1', {async:true, silent:true});
      terminate() ;
    }
} ) ;
 
term.on( 'terminal' , function( name , data ) {
    term.moveTo( 1 , 16 , "Terminal event %s, %s." , name , data ) ;
//    console.log( "'terminal' event:" , name , data ) ;
} ) ;
 
term.on( 'mouse' , function( name , data ) {
    term.moveTo( 1 , 6 , "%s, X: %d Y: %d   " , name , data.x, data.y ) ;
//    console.log( "'terminal' event:" , name , data ) ;
    if (name == 'MOUSE_LEFT_BUTTON_PRESSED') {
      if ((data.x < 12) && (data.x >= 0)) {
        if ((data.y <= 5) && (data.y >= 0)) {
          if (mokidata.heater == 'ON') {
            mokidata.heater = 'OFF'
            heater(mokidata);
          } else {
            mokidata.heater = 'ON'
            heater(mokidata);
          }
        }
      }
    }
//    console.log( "'mouse' event:" , name , data ) ;
} ) ;

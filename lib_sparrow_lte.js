/**
 * Created by Il Yeup, Ahn in KETI on 2019-11-30.
 */

/**
 * Copyright (c) 2019, OCEAN
 * All rights reserved.
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * 3. The name of the author may not be used to endorse or promote products derived from this software without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// for TAS of mission


var mqtt = require('mqtt');
var fs = require('fs');
var SerialPort = require('serialport');

var argv = process.argv.slice(2);

var lib = {};
lib.name = argv[0];
lib.serialPortNum = argv[1];
lib.serialBaudrate = argv[2];

var lib_mqtt_client = null;
var lib_topic = [];

msw_mqtt_connect('localhost', 1883);

function msw_mqtt_connect(broker_ip, port) {
    if(lib_mqtt_client == null) {
        var connectOptions = {
            host: broker_ip,
            port: port,
//              username: 'keti',
//              password: 'keti123',
            protocol: "mqtt",
            keepalive: 10,
//              clientId: serverUID,
            protocolId: "MQTT",
            protocolVersion: 4,
            clean: true,
            reconnectPeriod: 2000,
            connectTimeout: 2000,
            rejectUnauthorized: false
        };

        lib_mqtt_client = mqtt.connect(connectOptions);
    }

    lib_mqtt_client.on('connect', function () {
        console.log('[msw_mqtt_connect] connected to ' + broker_ip);
        for(var idx in lib_topic) {
            if(lib_topic.hasOwnProperty(idx)) {
                lib_mqtt_client.subscribe(lib_topic[idx]);
                console.log('[lib_mqtt_connect] lib_topic[' + idx + ']: ' + lib_topic[idx]);
            }
        }
    });

    lib_mqtt_client.on('message', function (topic, message) {
        for(var idx in lib_topic) {
            if (lib_topic.hasOwnProperty(idx)) {
                if(topic == lib_topic[idx]) {
                    setTimeout(on_receive_from_msw, parseInt(Math.random() * 5), topic, message.toString());
                    break;
                }
            }
        }
    });

    lib_mqtt_client.on('error', function (err) {
        console.log(err.message);
    });
}

function on_receive_from_msw(topic, str_message) {
    console.log('[' + topic + '] ' + str_message);
}

function send_data_to_msw(data_topic, obj_data) {
    lib_mqtt_client.publish(data_topic, JSON.stringify(obj_data));
}

var missionPort = null;
var missionPortNum = lib.serialPortNum;
var missionBaudrate = lib.serialBaudrate;

missionPortOpening();

var SerialPort = require('serialport');

function missionPortOpening() {
    if (missionPort == null) {
        missionPort = new SerialPort(missionPortNum, {
            baudRate: parseInt(missionBaudrate, 10),
        });

        missionPort.on('open', missionPortOpen);
        missionPort.on('close', missionPortClose);
        missionPort.on('error', missionPortError);
        missionPort.on('data', missionPortData);
    }
    else {
        if (missionPort.isOpen) {

        }
        else {
            missionPort.open();
        }
    }
}

function missionPortOpen() {
    console.log('missionPort open. ' + missionPortNum + ' Data rate: ' + missionBaudrate);

    setInterval(lteReqGetRssi, 2000);
}

function lteReqGetRssi() {
    if(missionPort != null) {
        if (missionPort.isOpen) {
            //var message = new Buffer.from('AT+CSQ\r');
            var message = new Buffer.from('AT@DBG\r');
            missionPort.write(message);
        }
    }
}

function missionPortClose() {
    console.log('missionPort closed.');

    setTimeout(missionPortOpening, 2000);
}

function missionPortError(error) {
    var error_str = error.toString();
    console.log('[missionPort error]: ' + error.message);
    if (error_str.substring(0, 14) == "Error: Opening") {

    }
    else {
        console.log('missionPort error : ' + error);
    }

    setTimeout(missionPortOpening, 2000);
}

var lteQ = {};
var missionStr = '';
function missionPortData(data) {
    missionStr += data.toString();

    var arrRssi = missionStr.split('OK');

    if(arrRssi.length >= 2) {
        var strLteQ = arrRssi[0].replace(/ /g, '');
        var arrLteQ = strLteQ.split(',');

        for(var idx in arrLteQ) {
            if(arrLteQ.hasOwnProperty(idx)) {
                var arrQValue = arrLteQ[idx].split(':');
                if(arrQValue[0] == '@DBG') {
                    lteQ.plmn = arrQValue[2];
                }
                else if(arrQValue[0] == 'Band') {
                    lteQ.band = parseInt(arrQValue[1]);
                }
                else if(arrQValue[0] == 'EARFCN') {
                    lteQ.earfcn = parseInt(arrQValue[1]);
                }
                else if(arrQValue[0] == 'Bandwidth') {
                    lteQ.bandwidth = parseInt(arrQValue[1].replace('MHz', ''));
                }
                else if(arrQValue[0] == 'PCI') {
                    lteQ.pci = parseInt(arrQValue[1]);
                }
                else if(arrQValue[0] == 'Cell-ID') {
                    lteQ.cell_id = arrQValue[1];
                }
                else if(arrQValue[0] == 'GUTI') {
                    lteQ.guti = arrQValue[1];
                }
                else if(arrQValue[0] == 'TAC') {
                    lteQ.tac = parseInt(arrQValue[1]);
                }
                else if(arrQValue[0] == 'RSRP') {
                    lteQ.rsrp = parseFloat(arrQValue[1].replace('dbm', ''));
                }
                else if(arrQValue[0] == 'RSRQ') {
                    lteQ.rsrq = parseFloat(arrQValue[1].replace('dbm', ''));
                }
                else if(arrQValue[0] == 'RSSI') {
                    lteQ.rssi = parseFloat(arrQValue[1].replace('dbm', ''));
                }
                else if(arrQValue[0] == 'SINR') {
                    lteQ.sinr = parseFloat(arrQValue[1].replace('db', ''));
                }
            }
        }

        var container_name = 'LTE';
        var data_topic = '/MUV/data/' + lib.name + '/' + container_name;

        setTimeout(send_data_to_msw, 0, data_topic, lteQ);

        missionStr = '';
    }
}

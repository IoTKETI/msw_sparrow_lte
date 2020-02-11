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

var config = {};
try {
    config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
}
catch (e) {
    config.gcs = 'KETI_MUV';
    config.drone = 'FC_MUV_01';
    config.serialPortNum = '/dev/ttyUSB1';
    config.serialBaudrate = '115200';

    fs.writeFileSync('config.json', JSON.stringify(cse_host, null, 4), 'utf8');
}

var msw_mqtt_client = null;
var noti_topic = [];
msw_mqtt_connect('localhost', 1883, noti_topic);

function msw_mqtt_connect(broker_ip, port, noti_topic) {
    if(msw_mqtt_client == null) {
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

        msw_mqtt_client = mqtt.connect(connectOptions);
    }

    msw_mqtt_client.on('connect', function () {
        console.log('[msw_mqtt_connect] connected to ' + broker_ip);
        for(var idx in noti_topic) {
            if(noti_topic.hasOwnProperty(idx)) {
                msw_mqtt_client.subscribe(noti_topic[idx]);
                console.log('[msw_mqtt_connect] noti_topic[' + idx + ']: ' + noti_topic[idx]);
            }
        }
    });

    msw_mqtt_client.on('message', function (topic, message) {
        for(var idx in noti_topic) {
            if (noti_topic.hasOwnProperty(idx)) {
                if(topic == noti_topic[idx]) {
                    console.log(message);
                    break;
                }
            }
        }
    });

    msw_mqtt_client.on('error', function (err) {
        console.log(err.message);
    });
}

var missionPort = null;

var missionPortNum = config.serialPortNum;
var missionBaudrate = config.serialBaudrate;

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

            var gpi = {};
            gpi.rssi = parseInt(Math.random()*100-200);
            sendLteRssi(gpi);
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
                    gpi.GLOBAL_POSITION_INT.plmn = arrQValue[2];
                }
                else if(arrQValue[0] == 'Band') {
                    gpi.GLOBAL_POSITION_INT.band = parseInt(arrQValue[1]);
                }
                else if(arrQValue[0] == 'EARFCN') {
                    gpi.GLOBAL_POSITION_INT.earfcn = parseInt(arrQValue[1]);
                }
                else if(arrQValue[0] == 'Bandwidth') {
                    gpi.GLOBAL_POSITION_INT.bandwidth = parseInt(arrQValue[1].replace('MHz', ''));
                }
                else if(arrQValue[0] == 'PCI') {
                    gpi.GLOBAL_POSITION_INT.pci = parseInt(arrQValue[1]);
                }
                else if(arrQValue[0] == 'Cell-ID') {
                    gpi.GLOBAL_POSITION_INT.cell_id = arrQValue[1];
                }
                else if(arrQValue[0] == 'GUTI') {
                    gpi.GLOBAL_POSITION_INT.guti = arrQValue[1];
                }
                else if(arrQValue[0] == 'TAC') {
                    gpi.GLOBAL_POSITION_INT.tac = parseInt(arrQValue[1]);
                }
                else if(arrQValue[0] == 'RSRP') {
                    gpi.GLOBAL_POSITION_INT.rsrp = parseFloat(arrQValue[1].replace('dbm', ''));
                }
                else if(arrQValue[0] == 'RSRQ') {
                    gpi.GLOBAL_POSITION_INT.rsrq = parseFloat(arrQValue[1].replace('dbm', ''));
                }
                else if(arrQValue[0] == 'RSSI') {
                    gpi.GLOBAL_POSITION_INT.rssi = parseFloat(arrQValue[1].replace('dbm', ''));
                }
                else if(arrQValue[0] == 'SINR') {
                    gpi.GLOBAL_POSITION_INT.sinr = parseFloat(arrQValue[1].replace('db', ''));
                }
            }
        }

        setTimeout(sendLteRssi, 0, gpi);

        missionStr = '';
    }
}

function sendLteRssi(gpi) {
    var container_name = 'LTE';
    var data_topic = '/Mobius/' + config.gcs + '/Mission_Data/' + config.drone + '/' + config.name + '/' + container_name;

    msw_mqtt_client.publish(data_topic, JSON.stringify(gpi));
}


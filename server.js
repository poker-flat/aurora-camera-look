/**
 * File: server.js
 * Author: Jonathan Sawyer
 * Copyright: 2012, Poker Flat Research Range, University of Alaska Fairbanks
 * License: MIT License
 */

// Requires
var dgram = require("dgram");
var winston = require("winston");
var nconf = require("nconf");
var UltraParser = require("./lib/ultra_parser.js");
var geodetic = require("./lib/geodetic.js");
//var sys = require("util");
//var http = require("http");
//var url = require("url");
//var path = require("path");
//var fileSystem = require("fs");
//var nowjs = require("now");
//var Point = require("./js/Point");

nconf.argv().env().file({ file: 'config.json' })

var date = new Date();
var logger = new winston.Logger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: nconf.get("log:dir")+"/"+date.toISOString()+"_.log",
            maxsize: nconf.get("log:maxsize"),
            json: nconf.get("log:json")
        })
    ]
});
var parser = new UltraParser(logger);

parser.on("err", function(msg) {
    logger.info('Error: ' + msg);
});

var server = dgram.createSocket("udp4");

server.on("message", function (msg, rinfo) {
    logger.info("server got: message from " +
                rinfo.address + ":" + rinfo.port);
    logger.info("Running ultra parser...");
    var info = parser.parse(msg);
    logger.info("------------------------");
    logger.info("X:", info.e_position);
    logger.info("Y:", info.f_position);
    logger.info("Z:", info.g_position);
    logger.info("Position Scale:", info.position_scale);
    logger.info("X Velocity:", info.e_velocity);
    logger.info("Y Velocity:", info.f_velocity);
    logger.info("Z Velocity:", info.g_velocity);
    logger.info("Velocity Scale:", info.velocity_scale);
    logger.info("Liftoff Flag:", info.liftoff_flag.toString());
    logger.info("Plunge Flag:", info.plunge_flag.toString());
    logger.info("Mode:", info.mode);
    logger.info("Parsed Correctly?", info.parsed);
    logger.info("");
    logger.info("ECEFtoWGS84:", geodetic.ECEFtoWGS84(info.e_position, info.f_position, info.g_position));
    logger.info("WGS84toECEF:", geodetic.WGS84toECEF(-147, 65, 100));
});

server.on("listening", function () {
    var address = server.address();
    logger.info("server listening " +
                address.address + ":" + address.port);
});

server.bind(nconf.get("ultra:port"), nconf.get("ultra:host"));


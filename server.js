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

parser.on('err', function(err) {
    logger.info('Error: ' + err['error']);
});

var server = dgram.createSocket("udp4");

server.on("message", function (msg, rinfo) {
    logger.info("server got: message from " +
                rinfo.address + ":" + rinfo.port);
    logger.info("Running ultra parser...");
    parser.parse(msg);
});

server.on("listening", function () {
    var address = server.address();
    logger.info("server listening " +
                address.address + ":" + address.port);
});

server.bind(nconf.get("ultra:port"), nconf.get("ultra:host"));


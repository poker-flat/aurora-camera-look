/**
 * File: server.js
 * Author: Jonathan Sawyer
 * Copyright: 2012, Poker Flat Research Range, University of Alaska Fairbanks
 * License: MIT License
 */

// Requires
var dgram = require("dgram");
//var sys = require("util");
//var http = require("http");
//var url = require("url");
//var path = require("path");
//var fileSystem = require("fs");
//var nowjs = require("now");
//var Point = require("./js/Point");

var server = dgram.createSocket("udp4");

server.on("message", function (msg, rinfo) {
  console.log("server got: " + msg + " from " +
    rinfo.address + ":" + rinfo.port);
});

server.on("listening", function () {
  var address = server.address();
  console.log("server listening " +
      address.address + ":" + address.port);
});

server.bind(41234);


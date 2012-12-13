/**
 * File: client.js
 * Author: Jonathan Sawyer
 * Copyright: 2012, Poker Flat Research Range, University of Alaska Fairbanks
 * License: MIT License
 */

// Requires
var dgram = require('dgram');
var lineReader = require('line-reader');
var S = require("string"); // for trim
var client = dgram.createSocket("udp4");

function parseLine(line, last, callback) {
    var l = S(line).trim().s;
    //console.log(l)
    var buf = new Buffer(l, "hex");
    //console.log(buf);
    //console.log(buf.toString('binary'));
    client.send(buf, 0, buf.length, 41234, "localhost"/*, function(err, bytes) {}*/);
    if (last) {
        client.close();
        return false;
    }
    callback();
}

function getLine(line, last, callback) {
    setTimeout(function() {
        parseLine(line, last, callback);
    }, 100);
}

lineReader.eachLine('./raw/Powell_hex.txt', getLine);

/*
var message = new Buffer("Some bytes");
var client = dgram.createSocket("udp4");
console.log("Sending message:", message);
client.send(message, 0, message.length, 41234, "localhost", function(err, bytes) {
  client.close();
});
*/


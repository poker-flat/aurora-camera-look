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

var filenames = [
    "./raw/Powell_302bytes_hex.txt",
    "./raw/Powell_hex.txt"
];

function parseLine(line, last, callback) {
    var l = S(line).trim().s;
    //console.log(l)
    var buf = new Buffer(l, "hex");
    //console.log(buf);
    //console.log(buf.toString('binary'));
    client.send(buf, 0, buf.length, 41234, "localhost"/*, function(err, bytes) {}*/);
    if (last) {
        return false;
    }
    callback();
}

function getLine(line, last, callback) {
    setTimeout(function() {
        parseLine(line, last, callback);
    }, 100);
}

function doIt() {
    console.log("Sending lines...");
    lineReader.eachLine(filenames[0], getLine);
}

setInterval(doIt, 600*100+2000);

doIt();

/*
var message = new Buffer("Some bytes");
var client = dgram.createSocket("udp4");
console.log("Sending message:", message);
client.send(message, 0, message.length, 41234, "localhost", function(err, bytes) {
  client.close();
});
*/


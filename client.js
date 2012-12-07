/**
 * File: client.js
 * Author: Jonathan Sawyer
 * Copyright: 2012, Poker Flat Research Range, University of Alaska Fairbanks
 * License: MIT License
 */

// Requires
var dgram = require('dgram');

var message = new Buffer("Some bytes");
var client = dgram.createSocket("udp4");
console.log("Sending message:", message);
client.send(message, 0, message.length, 41234, "localhost", function(err, bytes) {
  client.close();
});

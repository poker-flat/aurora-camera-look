/**
 * File: ultra_parser.js
 * Author: Jonathan Sawyer <jmsawyer@alaska.edu>
 * Copyright: 2013, Poker Flat Research Range, University of Alaska Fairbanks
 * License: MIT License
 */

var events = require('events');

UltraParser = function(logger) {
    this.logger = logger;
}

UltraParser.prototype = new events.EventEmitter;

/**
 * Method: parse
 *
 * Parse the data represented by `data`. It is expected to be 302 bytes with
 * this signature:
 *
 * 16 bytes - WFF Ethernet Fixed Header
 * 256 bytes - SIPS Header
 * 30 bytes - STDN LTAS Frame
 *
 * Parameters:
 * data - {Buffer} The buffer representing the data
 *
 * Return:
 * One of
 * - `true` - if parsing was successful
 * - {'error': 'error message'} - if parsing was not successful
 */
UltraParser.prototype.parse = function(data) {
    this.logger.info(data.toString('hex'));
    
    // Todo: test for <302 bytes
    // Check to see if the length of the message is less than 302 bytes
    this.logger.info("Parsing " + data.length + " bytes...");
    if (data.length < 302) {
        var err = {'error': 'The message to parse is too small. (Need 302 bytes)'};
        this.emit('err', err);
        return false;
    }
    
    // Todo: test for >302 bytes
    // Check to see if the length is greater than 302 bytes. If so,
    // slice the last 302 bytes off the message and process that instead.
    // We are eventually looking for one of two sets of Sync bytes.
    if (data.length > 302) {
        data = data.slice(data.length-302, data.length);
    }
    
    var sync_bytes = data.slice(data.length-2, data.length).toString("hex");
    this.logger.info("Sync bytes (hex): " + sync_bytes);

    if (sync_bytes != "5858" && sync_bytes != "58a0") {
        var err = {'error': 'The message to parse is malformed. Expected sync bytes of `5858` or `58a0`, but got `' + sync_bytes + '`'};
        this.emit('err', err);
        return false;
    }

    this.parseWffEthernetFixedHeader(data);
}

UltraParser.prototype.parseWffEthernetFixedHeader = function(data) {
    var wefh = data.slice(0, 16);
    this.logger.info("WFF Ethernet Fixed Header: " + wefh.toString("hex"));

    // BYTES 1-4
    // Calculate the word byte ordering of the data.
    // Type: bytes; flag
    // Values are:
    // 0xFFFFFFFF - data is encoded in little endian
    // 0x00000000 - the data is encoded in big endian
    var word_byte_ordering = wefh.slice(0, 4).toString("hex");
    this.logger.info("WFF Ethernet Fixed Header - Word Byte Ordering: " + word_byte_ordering);
    if (word_byte_ordering == "FFFFFFFF") {
        var endian = "little";
    }
    else if (word_byte_ordering == "00000000") {
        var endian = "big";
    }
    else {
        this.emit('err', {'error': 'in WFF Ethernet Fixed Header: cannot determine the endianness of the data. Expected `FFFFFFFF` or `00000000`, but got `' + word_byte_ordering.toString("hex") + '`'});
        return false;
    }
    this.logger.info("WFF Ethernet Fixed Header - Word Byte Ordering - Result: " + endian + " endian");

    // BYTES 5-8
    // Calculate the extended header type.
    // Type: unsigned integer; enumeration
    // Values are:
    // 0x00000000 - No extended header follows the fixed header
    // 0x00000001 - Standard WFF Extended Header follows the fixed header
    // 0x00000002 - Donna's Extended Header follows the fixed header
    // 0x00000003 - SIPS Extended Header follows the fixed header
    var extended_header_type = wefh.slice(4, 8);
    this.logger.info("WFF Ethernet Fixed Header - Extended Header Type: " + extended_header_type.toString("hex"));
    var eht = extended_header_type.readUInt32BE(0);
    switch(eht) {
    case 0:
        var extended_header = 0;
        break;
    case 1:
        var extended_header = 1; // should be this one
        break;
    case 2:
        var extended_header = 2;
        break;
    case 3:
        var extended_header = 3;
        break;
    default:
        this.emit('err', {'error': 'in WFF Ethernet Fixed Header: cannot determine the extended header type. Expected 0, 1, 2, 3, but got `' + eht + '`.'});
        return false;
    }
    this.logger.info("WFF Ethernet Fixed Header - Extended Header Type - Result: " + extended_header);

    // BYTES 9-12
    // Calculate the body size.
    // Type: unsigned integer; count
    // Values are: 0x0 .. 0xFFFFFFFF
    var body_size = wefh.slice(8, 12);
    this.logger.info("WFF Ethernet Fixed Header - Body Size: " + body_size.toString("hex"));
    var bsize = body_size.readUInt32BE(0);
    this.logger.info("WFF Ethernet Fixed Header - Body Size - Result: " + bsize);

    // BYTES 13-16
    // Calculate the number of blocks in the message that follows.
    // Type: unsigned integer; count
    // Values are: 0x0 .. 0xFFFFFFFF
    var body_blocking_size = wefh.slice(12, 16);
    this.logger.info("WFF Ethernet Fixed Header - Body Blocking Size: " + body_blocking_size.toString("hex"));
    var bblocks = body_blocking_size.readUInt32BE(0);
    this.logger.info("WFF Ethernet Fixed Header - Body Blocking Size - Result: " + bblocks);

    this.parseSipsHeader(data);
}

UltraParser.prototype.parseSipsHeader = function(data) {
    var sips_header = data.slice(16, 272);
    this.logger.info("SIPS Header: " + sips_header.toString("hex"));

    this.parseLtasFrame(data);
}

UltraParser.prototype.parseLtasFrame = function(data) {
    var ltas_frame = data.slice(272, data.length);
    this.logger.info("LTAS Frame: " + ltas_frame.toString("hex"));

    return;
}
module.exports = UltraParser;


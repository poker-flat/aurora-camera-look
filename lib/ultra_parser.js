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
 * - "error message" - if parsing was not successful
 */
UltraParser.prototype.parse = function(data) {
    this.logger.info("");
    this.logger.info("------------------------------------------------------");
    this.logger.info("");
    
    // Todo: test for <302 bytes
    // Check to see if the length of the message is less than 302 bytes
    this.logger.info("Parsing " + data.length + " bytes: " + data.toString("hex"));
    if (data.length < 302) {
        this.emit('err', 'The message to parse is too small. (Need 302 bytes)');
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
        this.emit('err', 'The message to parse is malformed. Expected sync bytes of `5858` or `58a0`, but got `' + sync_bytes + '`');
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
    if (word_byte_ordering == "FFFFFFFF") {
        var endian = "little";
    }
    else if (word_byte_ordering == "00000000") {
        var endian = "big";
    }
    else {
        this.emit('err', 'in WFF Ethernet Fixed Header: cannot determine the endianness of the data. Expected `FFFFFFFF` or `00000000`, bu0t got `' + word_byte_ordering.toString("hex") + '`');
        return false;
    }
    this.logger.info("WFF Ethernet Fixed Header - Word Byte Ordering: " + endian + " endian (" + word_byte_ordering + ")");

    // BYTES 5-8
    // Calculate the extended header type.
    // Type: unsigned integer; enumeration
    // Values are:
    // 0x00000000 - No extended header follows the fixed header
    // 0x00000001 - Standard WFF Extended Header follows the fixed header
    // 0x00000002 - Donna's Extended Header follows the fixed header
    // 0x00000003 - SIPS Extended Header follows the fixed header
    var extended_header_type = wefh.slice(4, 8);
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
        this.emit('err', 'in WFF Ethernet Fixed Header: cannot determine the extended header type. Expected 0, 1, 2, 3, but got `' + eht + '`.');
        return false;
    }
    this.logger.info("WFF Ethernet Fixed Header - Extended Header Type: " + extended_header + " (" + extended_header_type.toString("hex") + ")");

    // BYTES 9-12
    // Calculate the body size.
    // Type: unsigned integer; count
    // Values are: 0x0 .. 0xFFFFFFFF
    var body_size = wefh.slice(8, 12);
    var bsize = body_size.readUInt32BE(0);
    this.logger.info("WFF Ethernet Fixed Header - Body Size: " + bsize + " (" + body_size.toString("hex") + ")");

    // BYTES 13-16
    // Calculate the number of blocks in the message that follows.
    // Type: unsigned integer; count
    // Values are: 0x0 .. 0xFFFFFFFF
    var body_blocking_size = wefh.slice(12, 16);
    var bblocks = body_blocking_size.readUInt32BE(0);
    this.logger.info("WFF Ethernet Fixed Header - Body Blocking Size: " + bblocks + " (" + body_blocking_size.toString("hex") + ")");

    this.parseSipsHeader(data);
}

UltraParser.prototype.parseSipsHeader = function(data) {
    var sips_header = data.slice(16, 272);
    this.logger.info("SIPS Header: " + sips_header.toString("hex"));

    this.parseWFFEthernetAddress(data);
}

UltraParser.prototype.parseWFFEthernetAddress = function(data) {
    var ethernet_address = data.slice(16, 112);
    this.logger.info("SIPS Header - WFF Ethernet Address: " + ethernet_address.toString("hex"));

    // BYTES 1-16
    // Calculate the Site ID
    // Type: character; null terminated
    // Values: (example) WFF, PFRR
    var site_id = ethernet_address.slice(0, 16);
    this.logger.info("SIPS Header - WFF Ethernet Address - Site ID: '" + site_id.toString() + "' (" + site_id.toString("hex") + ")");

    // BYTES 17-32
    // Calculate the System Source Name
    // Type: character; null terminated
    // Values: (example) AWOTS
    var system_name = ethernet_address.slice(16,32);
    this.logger.info("SIPS Header - WFF Ethernet Address - System Source Name: '" + system_name.toString() + "' (" + system_name.toString("hex") + ")");

    // BYTES 33-48
    // Calculate the Logical Unit Name
    // Type: character; null terminated
    // Values: (example) Recorder
    var logical_name = ethernet_address.slice(32, 48);
    this.logger.info("SIPS Header - WFF Ethernet Address - Logical Unit Name: '" + logical_name.toString() + "' (" + logical_name.toString("hex") + ")");

    // BYTES 49-52
    // Calculate the Address Type
    // Type: unsigned integer; enumeration
    // Values: 0 for Socket, 1 for Windows Pipe
    var address_type = ethernet_address.slice(48, 52);
    var atype = address_type.readUInt32BE(0);
    switch (atype) {
    case 0:
        var type = "socket";
        break;
    case 1:
        var type = "windows pipe";
        break;
    default:
        var type = "uknown";
        this.emit('err', 'in SIPS Header: unknown address type `' + atype + '`');
        return false;
    }
    this.logger.info("SIPS Header - WFF Ethernet Address - Address Type: " + type + " (" + address_type.toString("hex") + ")");

    // BYTES 53-84
    // Calculate the Box ID
    // Type: character; null terminated
    // Values: (example) WRAM
    var box_id = ethernet_address.slice(52, 84);
    this.logger.info("SIPS Header - WFF Ethernet Address - Box ID: '" + box_id.toString() + "' (" + box_id.toString("hex") + ")");

    // BYTES 85-88
    // Calculate the Task ID
    // Type: unsigned integer
    // Values: (example) 0
    var task_id = ethernet_address.slice(84, 88);
    var t_id = task_id.readUInt32BE(0);
    this.logger.info("SIPS Header - WFF Ethernet Address - Task ID: " + t_id + " (" + task_id.toString("hex") + ")");

    this.parseWFFEthernetTargetPosition(data);

    // Note: the last 8 bytes are reserved for future use
}

UltraParser.prototype.parseWFFEthernetTargetPosition = function(data) {
    var target_position = data.slice(112, 208);
    this.logger.info("SIPS Header - WFF Ethernet Target Position: " + target_position.toString("hex"));

    // BYTES 1-4
    // Is Range Available?
    // Type: unsigned integer (boolean)
    // Values: 0 is No, 1 is Yes
    var range_available = target_position.slice(0, 4)
    var range = range_available.readUInt32BE(0);
    switch(range) {
    case 0:
        var available = "No";
        break;
    case 1:
        var available = "Yes";
        break;
    default:
        var available = "Unknown";
        this.emit('err', 'in SIPS Header: cannot determine if Range is Available. Expected 0 or 1, got: ' + range);
        return;
        break;
    }
    this.logger.info("SIPS Header - WFF Ethernet Target Position - Range Available: " + available + " (" + range_available.toString("hex"));
    
    

    this.parseWFFEthernetID(data);
}

UltraParser.prototype.parseWFFEthernetID = function(data) {
    var ethernet_id = data.slice(208, 252);
    this.logger.info("SIPS Header - WFF Ethernet ID: " + ethernet_id.toString("hex"));

    this.parseWFFEthernetTimestamp(data);
}

UltraParser.prototype.parseWFFEthernetTimestamp = function(data) {
    var ethernet_timestamp = data.slice(252, 268);
    this.logger.info("SIPS Header - WFF Ethernet Timestamp: " + ethernet_timestamp.toString("hex"));

    this.parseLtasFrame(data);

    // Note: there are 4 remaining bytes in the SIPS Header that is unused and
    // are considered "spares".
}

UltraParser.prototype.parseLtasFrame = function(data) {
    var ltas_frame = data.slice(272, data.length);
    this.logger.info("LTAS Frame: " + ltas_frame.toString("hex"));

    return;
}

module.exports = UltraParser;


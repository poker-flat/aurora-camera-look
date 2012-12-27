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
 * Events:
 * err(msg) - on error, the 'err' event is called with a 'msg' noting the error message
 *
 * Return:
 * - null
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
	return;
    }

    this.parseWffEthernetFixedHeader(data);
}

/**
 * Method: parseWffEthernetFixedHeader 
 *
 * Parse the data represented by `data`. It is expected to be 302 bytes with
 * this signature:
 *
 * 16 bytes - WFF Ethernet Fixed Header
 * 256 bytes - SIPS Header
 * 30 bytes - STDN LTAS Frame
 *
 * The parsing is for the WFF Ethernet Fixed Header section which contains a
 * signature of:
 *
 * 4 bytes - Word Byte Ordering
 * 4 bytes - Extended Header Type
 * 4 bytes - Body Size
 * 4 bytes - Body Blocking size
 *
 * Parameters:
 * data - {Buffer} The buffer representing the data
 *
 * Events:
 * err(msg) - on error, the 'err' event is called with a 'msg' noting the error message
 *
 * Return:
 * - null
 */
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
        var endian = "unknown";
        this.emit('err', 'in WFF Ethernet Fixed Header: cannot determine the endianness of the data. Expected `FFFFFFFF` or `00000000`, bu0t got `' + word_byte_ordering.toString("hex") + '`');
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

/**
 * Method: parseSipsHeader 
 *
 * Parse the data represented by `data`. It is expected to be 302 bytes with
 * this signature:
 *
 * 16 bytes - WFF Ethernet Fixed Header
 * 256 bytes - SIPS Header
 * 30 bytes - STDN LTAS Frame
 *
 * The parsing is for the SIPS Header section which contains a signature of:
 *
 * 96 bytes - WFF Ethernet Address
 * 96 bytes - WFF Ethernet Target Position
 * 44 bytes - WFF Ethernet ID
 * 16 bytes - WFF Ethernet Timestamp
 * 4 bytes - spare (reserved for future use)
 *
 * Parameters:
 * data - {Buffer} The buffer representing the data
 *
 * Events:
 * err(msg) - on error, the 'err' event is called with a 'msg' noting the error message
 *
 * Return:
 * - null
 */
UltraParser.prototype.parseSipsHeader = function(data) {
    var sips_header = data.slice(16, 272);
    this.logger.info("SIPS Header: " + sips_header.toString("hex"));

    this.parseWFFEthernetAddress(data);
}

/**
 * Method: parseWFFEthernetAddress 
 *
 * Parse the data represented by `data`. It is expected to be 302 bytes with
 * this signature:
 *
 * 16 bytes - WFF Ethernet Fixed Header
 * 256 bytes - SIPS Header
 * 30 bytes - STDN LTAS Frame
 *
 * The SIPS Header section contains a signature of:
 *
 * 96 bytes - WFF Ethernet Address
 * 96 bytes - WFF Ethernet Target Position
 * 44 bytes - WFF Ethernet ID
 * 16 bytes - WFF Ethernet Timestamp
 * 4 bytes - spare (reserved for future use)
 *
 * This parsing is for the WFF Ethernet Address section which contains a signature of:
 *
 * 16 bytes - Site ID
 * 16 bytes - System Name
 * 16 bytes - Logical Unit Name
 * 4 bytes - Address Type
 * 32 bytes - Box ID
 * 4 bytes - Task ID
 * 8 bytes - spare (reserved for future use)
 *
 * Parameters:
 * data - {Buffer} The buffer representing the data
 *
 * Events:
 * err(msg) - on error, the 'err' event is called with a 'msg' noting the error message
 *
 * Return:
 * - null
 */
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
        break;
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

/**
 * Method: parseWFFEthernetTargetPosition 
 *
 * Parse the data represented by `data`. It is expected to be 302 bytes with
 * this signature:
 *
 * 16 bytes - WFF Ethernet Fixed Header
 * 256 bytes - SIPS Header
 * 30 bytes - STDN LTAS Frame
 *
 * The SIPS Header section contains a signature of:
 *
 * 96 bytes - WFF Ethernet Address
 * 96 bytes - WFF Ethernet Target Position
 * 44 bytes - WFF Ethernet ID
 * 16 bytes - WFF Ethernet Timestamp
 * 4 bytes - spare (reserved for future use)
 *
 * This parsing is for the WFF Ethernet Target Position section which contains a signature of:
 *
 * 4 bytes - Is Range Available?
 * 4 bytes - Time Stamp Year
 * 4 bytes - Time Stamp Day of Year
 * 4 bytes - Time Stamp Total Seconds GMT
 * 4 bytes - Time Stamp Fractional Seconds
 * 8 bytes - Tracker Latitude
 * 8 bytes - Tracker Longitude
 * 8 bytes - Tracker Height
 * 8 bytes - Target Azimuth
 * 8 bytes - Target Elevation
 * 8 bytes - Target Range
 * 4 bytes - Site ID
 * 1 byte - Data Quality
 * 23 bytes - spare (reserved for future use)
 *
 * Parameters:
 * data - {Buffer} The buffer representing the data
 *
 * Events:
 * err(msg) - on error, the 'err' event is called with a 'msg' noting the error message
 *
 * Return:
 * - null
 */
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
        break;
    }
    this.logger.info("SIPS Header - WFF Ethernet Target Position - Range Available: " + available + " (" + range_available.toString("hex") + ")");
    
    // BYTES 5-8
    // Calculate the year of the time stamp
    // Type: unsigned integer
    // Values: (example) 1998
    var year_raw = target_position.slice(4, 8);
    var year = year_raw.readUInt32BE(0);
    this.logger.info("SIPS Header - WFF Ethernet Target Position - Time Stamp Year: " + year + " (" + year_raw.toString("hex") + ")");

    // BYTES 9-12
    // Calculate the day of year of the time stamp
    // Type: unsigned integer
    // Values: [1..366]
    var day_raw = target_position.slice(8, 12);
    var day = day_raw.readUInt32BE(0);
    this.logger.info("SIPS Header - WFF Ethernet Target Position - Time Stamp Day of Year: " + day + " (" + day_raw.toString("hex") + ")");

    // BYTES 13-16
    // Calculate the total number of seconds since GMT for the day
    // Type: unsigned integer
    // Values: [0..86399]
    var seconds_raw = target_position.slice(12, 16);
    var seconds = seconds_raw.readUInt32BE(0);
    this.logger.info("SIPS Header - WFF Ethernet Target Position - Time Stamp Seconds (GMT): " + seconds + " (" + seconds_raw.toString("hex") + ")");

    // BYTES 17-20
    // Calculate the fractional seconds (microseconds)
    // Type: unsigned integer
    // Values: [0..999999]
    var useconds_raw = target_position.slice(16, 20);
    var useconds = useconds_raw.readUInt32BE(0);
    this.logger.info("SIPS Header - WFF Ethernet Target Position - Time Stamp Microseconds: " + useconds + " (" + useconds_raw.toString("hex") + ")");

    // BYTES 21-28
    // Calculate the Tracker Latitude
    // Type: double
    // Values: [-90..90]
    var tracker_lat_raw = target_position.slice(20, 28);
    var tracker_lat = tracker_lat_raw.readDoubleBE(0); // 64-bit
    this.logger.info("SIPS Header - WFF Ethernet Target Position - Tracker Latitude: " + tracker_lat + " (" + tracker_lat_raw.toString("hex") + ")");

    // BYTES 29-36
    // Calculate the Tracker Longitude
    // Type: double
    // Values: [0..360.0)
    var tracker_lon_raw = target_position.slice(28, 36);
    var tracker_lon = tracker_lon_raw.readDoubleBE(0); // 64-bit
    this.logger.info("SIPS Header - WFF Ethernet Target Position - Tracker Longitude: " + tracker_lon + " (" + tracker_lon_raw.toString("hex") + ")");
    
    // BYTES 37-44
    // Calculate the Tracker Height
    // Type: double
    // Values: N/A
    var tracker_height_raw = target_position.slice(36, 44);
    var tracker_height = tracker_height_raw.readDoubleBE(0); // 64-bit
    this.logger.info("SIPS Header - WFF Ethernet Target Position - Tracker Height: " + tracker_height + " (" + tracker_height_raw.toString("hex") + ")");
    
    // BYTES 45-52 
    // Calculate the Target Azimuth
    // Type: double
    // Values: [0..360.0)
    var target_azi_raw = target_position.slice(44, 52);
    var target_azi = target_azi_raw.readDoubleBE(0); // 64-bit
    this.logger.info("SIPS Header - WFF Ethernet Target Position - Target Azimuth: " + target_azi + " (" + target_azi_raw.toString("hex") + ")");
    
    // BYTES 53-60 
    // Calculate the Target Elevation
    // Type: double
    // Values: [-90..90]
    var target_elev_raw = target_position.slice(52, 60);
    var target_elev = target_elev_raw.readDoubleBE(0); // 64-bit
    this.logger.info("SIPS Header - WFF Ethernet Target Position - Target Elevation: " + target_elev + " (" + target_elev_raw.toString("hex") + ")");

    // BYTES 61-68
    // Calculate the Target Range
    // Type: double
    // Values: ?
    var target_range_raw = target_position.slice(60, 68);
    var target_range = target_range_raw.readDoubleBE(0); // 64-bit
    this.logger.info("SIPS Header - WFF Ethernet Target Position - Target Range: " + target_range + " (" + target_range_raw.toString("hex") + ")");

    // BYTES 69-72
    // Calculate the Site ID
    // Type: unsigned integer
    // Values: ?
    var site_id_raw = target_position.slice(68, 72);
    var site_id = site_id_raw.readUInt32BE(0);
    this.logger.info("SIPS Header - WFF Ethernet Target Position - Site ID: " + site_id + " (" + site_id_raw.toString("hex") + ")");

    // BYTE 73
    // Calculate the Data Quality byte
    // Type: character
    // Values: G for Good, B for Bad, C for Computed
    var data_quality = target_position.slice(72, 73);
    this.logger.info("SIPS Header - WFF Ethernet Target Position - Data Quality: '" + data_quality.toString() + "' (" + data_quality.toString("hex") + ")");

    // BYTES 74-96
    // Spare bytes - reserved for future use

    this.parseWFFEthernetID(data);
}

/**
 * Method: parseWFFEthernetID 
 *
 * Parse the data represented by `data`. It is expected to be 302 bytes with
 * this signature:
 *
 * 16 bytes - WFF Ethernet Fixed Header
 * 256 bytes - SIPS Header
 * 30 bytes - STDN LTAS Frame
 *
 * The SIPS Header section contains a signature of:
 *
 * 96 bytes - WFF Ethernet Address
 * 96 bytes - WFF Ethernet Target Position
 * 44 bytes - WFF Ethernet ID
 * 16 bytes - WFF Ethernet Timestamp
 * 4 bytes - spare (reserved for future use)
 *
 * This parsing is for the WFF Ethernet ID section which contains a signature of:
 *
 * 16 bytes - Group
 * 4 bytes - Category
 * 4 bytes - Type
 * 4 bytes - Unit
 * 4 bytes - ID
 * 4 bytes - Is Certified?
 * 4 bytes - Priority
 * 4 bytes - Security Key
 *
 * Parameters:
 * data - {Buffer} The buffer representing the data
 *
 * Events:
 * err(msg) - on error, the 'err' event is called with a 'msg' noting the error message
 *
 * Return:
 * - null
 */
UltraParser.prototype.parseWFFEthernetID = function(data) {
    var ethernet_id = data.slice(208, 252);
    this.logger.info("SIPS Header - WFF Ethernet ID: " + ethernet_id.toString("hex"));

    // BYTES 1-16
    // Calculate the Group
    // Type: character; null terminated
    // Values: (example) AWOTS
    var group = ethernet_id.slice(0, 16);
    this.logger.info("SIPS Header - WFF Ethernet ID - Group: '" + group.toString() + "' (" + group.toString("hex") + ")");

    // BYTES 17-20
    // Calculate the Category
    // Type: unsigned integer; enumeratoin
    // Values: 0 for Command, 1 for Data, 2 for Status
    var category_raw = ethernet_id.slice(16, 20);
    var category_num = category_raw.readUInt32BE(0);
    switch(category_num) {
    case 0:
        var category = "Command";
        break;
    case 1:
        var category = "Data";
        break;
    case 2:
        var category = "Status";
        break;
    default:
        var category = "Unknown";
        break;
    }
    this.logger.info("SIPS Header - WFF Ethernet ID - Category: " + category + " (" + category_raw.toString("hex") + ")");

    // BYTES 21-24
    // Calculate the Type
    // Type: unsigned integer; enumeration
    // Values: 0 for Query, 1 for MDDF, 2 for LTAS, 3 for TIME, 4 for Execute
    var type_raw = ethernet_id.slice(20, 24);
    var type_num = type_raw.readUInt32BE(0);
    switch(type_num) {
    case 0:
        var type = "Query";
        break;
    case 1:
        var type = "MDDF";
        break;
    case 2:
        var type = "LTAS";
        break;
    case 3:
        var type = "TIME";
        break;
    case 4:
        var type = "Execute";
        break;
    default:
        var type = "Unknown";
        break;
    }
    this.logger.info("SIPS Header - WFF Ethernet ID - Type: " + type + " (" + type_raw.toString("hex") + ")");

    // BYTES 25-28
    // Calculate the Unit
    // Type: unsigned integer; enumeration
    // Values: (example) 0 (= not used)
    var unit_raw = ethernet_id.slice(24, 28);
    var unit_num = unit_raw.readUInt32BE(0);
    this.logger.info("SIPS Header - WFF Ethernet ID - Unit: " + unit_num + " (" + unit_raw.toString("hex") + ")");

    // BYTES 29-32
    // Calculate the ID
    // Type: integer
    // Values: (example) 65536
    var id_raw = ethernet_id.slice(28, 32);
    var id_num = id_raw.readInt32BE(0);
    this.logger.info("SIPS Header - WFF Ethernet ID - ID: " + id_num + " (" + id_raw.toString("hex") + ")");

    // BYTES 33-36
    // Calculate if the message Is Certified?
    // Type: boolean
    // Values: 0 for No, 1 for Yes
    var certified_raw = ethernet_id.slice(32, 36);
    var certified_num = certified_raw.readUInt32BE(0);
    switch(certified_num) {
    case 0:
        var certified = "No";
        break;
    case 1:
        var certified = "Yes";
        break;
    default:
        var certified = "Unknown";
        break;
    }
    this.logger.info("SIPS Header - WFF Ethernet ID - Is Certified? " + certified + " (" + certified_raw.toString("hex") + ")");

    // BYTES 37-40
    // Calculate the Priority
    // Type: integer
    // Values: (example) 2 (= normal)
    var priority_raw = ethernet_id.slice(36, 40);
    var priority_num = priority_raw.readInt32BE(0);
    this.logger.info("SIPS Header - WFF Ethernet ID - Priority: " + priority_num + " (" + priority_raw.toString("hex") + ")");

    // BYTES 41-44
    // Calculate the Security Key
    // Type: bytes
    // Values: 0 for Not Set, otherwise raw
    var security_key = ethernet_id.slice(40, 44);
    this.logger.info("SIPS Header - WFF Ethernet ID - Security Key: 0x" + security_key.toString("hex"));

    this.parseWFFEthernetTimestamp(data);
}

/**
 * Method: parseWFFEthernetTimestamp
 *
 * Parse the data represented by `data`. It is expected to be 302 bytes with
 * this signature:
 *
 * 16 bytes - WFF Ethernet Fixed Header
 * 256 bytes - SIPS Header
 * 30 bytes - STDN LTAS Frame
 *
 * The SIPS Header section contains a signature of:
 *
 * 96 bytes - WFF Ethernet Address
 * 96 bytes - WFF Ethernet Target Position
 * 44 bytes - WFF Ethernet ID
 * 16 bytes - WFF Ethernet Timestamp
 * 4 bytes - spare (reserved for future use)
 *
 * This parsing is for the WFF Ethernet Timestamp section which contains a signature of:
 *
 * 4 bytes - Time Stamp Year
 * 4 bytes - Time Stamp Day of Year
 * 4 bytes - Time Stamp Total Seconds GMT
 * 4 bytes - Time Stamp Fractional Seconds
 *
 * Parameters:
 * data - {Buffer} The buffer representing the data
 *
 * Events:
 * err(msg) - on error, the 'err' event is called with a 'msg' noting the error message
 *
 * Return:
 * - null
 */
UltraParser.prototype.parseWFFEthernetTimestamp = function(data) {
    var ethernet_timestamp = data.slice(252, 268);
    this.logger.info("SIPS Header - WFF Ethernet Timestamp: " + ethernet_timestamp.toString("hex"));

    // BYTES 1-4
    // Calculate the Time Stamp Year
    // Type: unsigned integer
    // Values: [0..4294967295]
    var year_raw = ethernet_timestamp.slice(0, 4);
    var year = year_raw.readUInt32BE(0);
    this.logger.info("SIPS Header - WFF Ethernet Timestamp - Year: " + year + " (" + year_raw.toString("hex") + ")");

    // BYTES 5-8
    // Calculate the Time Stamp Day of Year
    // Type: unsigned integer
    // Values: [0..366]
    var day_raw = ethernet_timestamp.slice(4, 8);
    var day = day_raw.readUInt32BE(0);
    this.logger.info("SIPS Header - WFF Ethernet Timestamp - Day of Year: " + day + " (" + day_raw.toString("hex") + ")");

    // BYTES 9-12
    // Calculate the Time Stamp Total Seconds GMT
    // Type: unsigned integer
    // Values: [0..86399]
    var sec_raw = ethernet_timestamp.slice(8, 12);
    var sec = sec_raw.readUInt32BE(0);
    this.logger.info("SIPS Header - WFF Ethernet Timestamp - Seconds from GMT: " + sec + " (" + sec_raw.toString("hex") + ")");

    // BYTES 13-16
    // Calculate the Time Stamp Microseconds
    // Type: unsigned integer
    // Values: [0..999999]
    var usec_raw = ethernet_timestamp.slice(12, 16);
    var usec = usec_raw.readUInt32BE(0);
    this.logger.info("SIPS Header - WFF Ethernet Timestamp - Microseconds: " + usec + " (" + usec_raw.toString("hex") + ")");

    this.parseLtasFrame(data);

    // Note: there are 4 remaining bytes in the SIPS Header that is unused and
    // are considered "spares".
}

/**
 * Method: parseLtasFrame
 *
 * Parse the data represented by `data`. It is expected to be 302 bytes with
 * this signature:
 *
 * 16 bytes - WFF Ethernet Fixed Header
 * 256 bytes - SIPS Header
 * 30 bytes - STDN LTAS Frame
 *
 * This parsing is for the STDN LTAS Frame section which contains a signature
 * of:
 *
 * (IN BITS!)
 * 13 bits - Satellite ID Code
 * 4 bits - Vehicle ID Code
 * 9 bits - Day of Year
 * 4 bits - Format Type
 * 4 bits - Time of Day
 * 9 bits - Site ID
 * 27 bits - E Position Component
 * 1 bit - Sign for E Position Component
 * 2 bits - Position Scale Code
 * 27 bits - F Position Component
 * 1 bit - Sign for F Position Component
 * 2 bits - Velocity Scale Code
 * 27 bits - G Position Component
 * 1 bit - Sign for G Position Component
 * 1 bit - Optical Track Bit
 * 1 bit - Plus Time Flag
 * 14 bits - F Velocity Component
 * 1 bit - Sign for F Velocity Component
 * 14 bits - E Velocity Component
 * 1 bit - Sign for E Velocity Component
 * 1 bit - Lift Off
 * 1 bit - Plunge Mode
 * 2 bits - Pulse Width
 * 1 bit - Refraction Correctoin
 * 1 bit - Droop
 * 1 bit - Paramp
 * 1 bit - Radiation
 * 1 bit - LO
 * 1 bit - Beacon/Skin
 * 1 bit - Track Bit
 * 1 bit - Quality Bit
 * 3 bits - Mode
 * 14 bits - G Velocity Component
 * 1 bit - Sign for G Velocity Component
 * 7 bits - Checksum
 * 7 bits - spare (reserved for future use)
 * 16 bits - Sync Bits
 *
 * Parameters:
 * data - {Buffer} The buffer representing the data
 *
 * Events:
 * err(msg) - on error, the 'err' event is called with a 'msg' noting the error message
 *
 * Return:
 * - null
 */
UltraParser.prototype.parseLtasFrame = function(data) {
    var ltas_frame = data.slice(272, data.length);
    this.logger.info("LTAS Frame: " + ltas_frame.toString("hex"));

    // BITS 1-13
    var satellite_id_raw = ltas_frame.slice(0, 2);
    // Bx 0001 1111 1111 1111 (0x1FFF)
    var satellite_id = satellite_id_raw.readUInt16LE(0) & 0x1FFF;
    this.logger.info("LTAS Frame - Satellite ID: " + satellite_id + " (LE 0x" + satellite_id_raw.toString("hex") + ")");

    // BITS 14-17
    var vehicle_id_raw = ltas_frame.slice(1, 3);
    // Bx 0000 0001 1110 0000
    // -> 0000 0000 0000 1111 (0x0F)
    var vehicle_id = (vehicle_id_raw.readUInt16LE(0) >>> 5) & 0x0F;
    this.logger.info("LTAS Frame - Vehicle ID: " + vehicle_id + " (LE 0x" + vehicle_id_raw.toString("hex") + ")");

    // BITS 18-26
    var day_raw = ltas_frame.slice(2, 4);
    // Bx 0000 0011 1111 1110
    // -> 0000 0001 1111 1111 (0x01FF)
    var day = (day_raw.readUInt16LE(0) >>> 1) & 0x01FF;
    this.logger.info("LTAS Frame - Day of Year: " + day + " (LE 0x" + day_raw.toString("hex") + ")");

    // BITS 27-30
    var format_type_raw = day_raw;
    // Bx 0011 1100 0000 0000
    // -> 0000 0000 0000 1111 (0x0F)
    var format_type = (format_type_raw.readUInt16LE(0) >>> 10) & 0x0F;
    this.logger.info("LTAS Frame - Format Type: " + format_type + " (LE 0x" + format_type_raw.toString("hex") + ")");

    // BITS 31-34
    var time_of_day_tenths_raw = ltas_frame.slice(3, 5);
    // Bx 0000 0011 1100 0000
    // -> 0000 0000 0000 1111 (0x0F)
    var time_of_day_tenths = ((time_of_day_tenths_raw.readUInt16LE(0) >>> 6) & 0x0F)/10.0;
    this.logger.info("LTAS Frame - Time of Day (Tenths of Seconds): " + time_of_day_tenths + " (LE 0x" + time_of_day_tenths_raw.toString("hex") + ")");

    // BITS 35-51
    var time_of_day_seconds_raw = ltas_frame.slice(4, 8);
    // Bx 0000 0000 0000 0111 1111 1111 1111 1100
    // -> 0000 0000 0000 0001 1111 1111 1111 1111 (0x0001FFFF)
    var time_of_day_seconds = (time_of_day_seconds_raw.readUInt32LE(0) >>> 2) & 0x0001FFFF;
    this.logger.info("LTAS Frame - Time of Day (Seconds): " + time_of_day_seconds + " (LE 0x" + time_of_day_seconds_raw.toString("hex") + ")");

    // BITS 52-60
    var site_id_raw = time_of_day_seconds_raw;
    // Bx 0000 1111 1111 1000 0000 0000 0000 0000
    // -> 0000 0000 0000 0000 0000 0001 1111 1111 (0x000001FF)
    var site_id = new Buffer(2);
    site_id.writeUInt16BE((site_id_raw.readUInt32LE(0) >>> 19) & 0x000001FF, 0);
    this.logger.info("LTAS Frame - Site ID: 0x" + site_id.toString("hex") + " (LE 0x" + site_id_raw.toString("hex") + ")");

    // BITS 61-87
    var e_position_raw = ltas_frame.slice(7, 11);
    // Bx 0111 1111 1111 1111 1111 1111 1111 0000
    // -> 0000 0111 1111 1111 1111 1111 1111 1111 (0x07FFFFFF)
    var e_position = (e_position_raw.readUInt32LE(0) >>> 4) & 0x07FFFFFF;
    this.logger.info("LTAS Frame - E Position Component: " + e_position + " (LE 0x" + e_position_raw.toString("hex") + ")");

    // BIT 88
    // Bx 1000 0000 0000 0000 0000 0000 0000 0000
    // -> 0000 0000 0000 0000 0000 0000 0000 0001 (0x1)
    var e_sign = (e_position_raw.readUInt32LE(0) >>> 31) & 0x1;
    this.logger.info("LTAS Frame - E Position Component Sign: " + e_sign);

    // Indicates the G Position Component sign. If sign is negative (1) then
    // G Position Component is in Two's Complement.
    if (e_sign == 1) {
        var e_position_corrected = -((e_position ^ 0x07FFFFFF) + 1);
        this.logger.info("LTAS Frame - E Position Component Corrected: " + e_position_corrected);
    }

    // BITS 89-90
    var pos_scale_raw = ltas_frame.slice(11, 12);
    // Bx 0000 0011 (0x03)
    var pos_scale_num = pos_scale_raw.readUInt8(0) & 0x03;
    switch(pos_scale_num) {
    case 0:
        var pos_factor = 1;
        break;
    case 1:
        var pos_factor = 10;
        break;
    case 2:
        var pos_factor = 10e3;
        break;
    case 3:
        var pos_factor = 10e10;
        break;
    }
    this.logger.info("LTAS Frame - Position Scale Code (PSC): " + pos_scale_num + " with factor " + pos_factor + " (LE 0x" + pos_scale_raw.toString("hex") + ")");

    // BITS 91-117
    var f_position_raw = ltas_frame.slice(11, 15);
    // Bx 0001 1111 1111 1111 1111 1111 1111 1100
    // -> 0000 0111 1111 1111 1111 1111 1111 1111 (0x07FFFFFF)
    var f_position = (f_position_raw.readUInt32LE(0) >>> 2) & 0x07FFFFFF;
    this.logger.info("LTAS Frame - F Position Component: " + f_position + " (LE 0x" + f_position_raw.toString("hex") + ")");

    // BIT 118
    // Bx 0010 0000 0000 0000 0000 0000 0000 0000
    // -> 0000 0000 0000 0000 0000 0000 0000 0001 (0x1)
    var f_sign = (f_position_raw.readUInt32LE(0) >>> 29) & 0x1;
    this.logger.info("LTAS Frame - F Position Component Sign: " + f_sign);

    // Indicates the F Position Component sign. If sign is negative (1) then
    // F Position Component is in Two's Complement.
    if (f_sign == 1) {
        var f_position_corrected = -((f_position ^ 0x07FFFFFF) + 1);
        this.logger.info("LTAS Frame - F Position Component Corrected: " + f_position_corrected);
    }

    // BITS 119-120
    // Bx 1100 0000 0000 0000 0000 0000 0000 0000
    // -> 0000 0000 0000 0000 0000 0000 0000 0011 (0x3)
    var vel_scale_num = (f_position_raw.readUInt32LE(0) >>> 30) & 0x3;
    switch(vel_scale_num) {
    case 0:
        var vel_factor = 1;
        break;
    case 1:
        var vel_factor = 10;
        break;
    default:
        var vel_factor = 0; // invalid otherwise
        break;
    }
    this.logger.info("LTAS Frame - Velocity Scale Code (VSC): " + vel_scale_num + " with factor " + vel_factor);
    
    // BITS 121-147
    // Bx 0000 0111 1111 1111 1111 1111 1111 1111 (0x07FFFFFF)
    var g_position_raw = ltas_frame.slice(15, 19);
    var g_position = g_position_raw.readUInt32LE(0) & 0x07FFFFFF;
    this.logger.info("LTAS Frame - G Position Component: " + g_position + " (LE 0x" + g_position_raw.toString("hex") + ")");

    // BIT 148
    // Bx 0000 1000 0000 0000 0000 0000 0000 0000
    // -> 0000 0000 0000 0000 0000 0000 0000 0001 (0x1)
    var g_sign = (g_position_raw.readUInt32LE(0) >>> 27) & 0x1;
    this.logger.info("LTAS Frame - G Position Component Sign: " + g_sign);

    // Indicates the G Position Component sign. If sign is negative (1) then
    // G Position Component is in Two's Complement.
    if (g_sign == 1) {
        var g_position_corrected = -((g_position ^ 0x07FFFFFF) + 1);
        this.logger.info("LTAS Frame - G Position Component Corrected: " + g_position_corrected);
    }

    // BIT 149
    // Bx 0001 0000 0000 0000 0000 0000 0000 0000
    // -> 0000 0000 0000 0000 0000 0000 0000 0001 (0x1)
    var optical_track_bit = (g_position_raw.readUInt32LE(0) >>> 28) & 0x1;
    this.logger.info("LTAS Frame - Optical Track Bit: " + optical_track_bit + " [should always be 0] (LE 0x" + g_position_raw.toString("hex") + ")");

    // BIT 150
    // Bx 0010 0000 0000 0000 0000 0000 0000 0000
    // -> 0000 0000 0000 0000 0000 0000 0000 0001 (0x1)
    var using_plus_time = (g_position_raw.readUInt32LE(0) >>> 29) & 0x1;
    this.logger.info("LTAS Frame - Using Plus Time: " + using_plus_time + " (LE 0x" + g_position_raw.toString("hex") + ")");

    // BITS 151-164
    // Bx 0000 0000 0000 1111 1111 1111 1100 0000
    // -> 0000 0000 0000 0000 0011 1111 1111 1111 (0x3FFF)
    var f_velocity_raw = ltas_frame.slice(18, 22);
    var f_velocity = (f_velocity_raw.readUInt32LE(0) >>> 6) & 0x3FFF;
    this.logger.info("LTAS Frame - F Velocity Component: " + f_velocity + " (LE 0x" + f_velocity_raw.toString("hex") + ")");
    
    // BIT 165
    // Bx 0000 0000 0001 0000 0000 0000 0000 0000
    // -> 0000 0000 0000 0000 0000 0000 0000 0001 (0x1)
    var f_vel_sign = (f_velocity_raw.readUInt32LE(0) >>> 20) & 0x1;
    this.logger.info("LTAS Frame - F Velocity Component Sign: " + f_vel_sign);

    // Indicates the F Velocity Component sign. If sign is negative (1) then
    // F Velocity Component is in Two's Complement.
    if (f_vel_sign == 1) {
        var f_velocity_corrected = -((f_velocity ^ 0x3FFF) + 1);
        this.logger.info("LTAS Frame - F Velocity Component Corrected: " + f_velocity_corrected);
    }

    // BITS 166-179
    // Bx 0000 0000 0000 0111 1111 1111 1110 0000
    // -> 0000 0000 0000 0000 0011 1111 1111 1111 (0x3FFF)
    var e_velocity_raw = ltas_frame.slice(20, 24);
    var e_velocity = (e_velocity_raw.readUInt32LE(0) >>> 5) & 0x3FFF;
    this.logger.info("LTAS Frame - E Velocity Component: " + e_velocity + " (LE 0x" + e_velocity_raw.toString("hex") + ")");

    // BIT 180
    // Bx 0000 0000 0000 1000 0000 0000 0000 0000
    // -> 0000 0000 0000 0000 0000 0000 0000 0001
    var e_vel_sign = (e_velocity_raw.readUInt32LE(0) >>> 19) & 0x1;
    this.logger.info("LTAS Frame - E Velocity Component Sign: " + e_vel_sign);

    // Indicates the E Velocity Component sign. If sign is negative (1) then
    // E Velocity Component is in Two's Complement.
    if (e_vel_sign == 1) {
        var e_velocity_corrected = -((e_velocity ^ 0x3FFF) + 1);
        this.logger.info("LTAS Frame - E Velocity Component Corrected: " + e_velocity_corrected);
    }

    // BIT 181
    // Bx 0000 0000 0001 0000 0000 0000 0000 0000
    // -> 0000 0000 0000 0000 0000 0000 0000 0001 (0x1)
    var liftoff_flag = (e_velocity_raw.readUInt32LE(0) >>> 20) & 0x1;
    this.logger.info("LTAS Frame - Liftoff: " + liftoff_flag + " (LE 0x" + e_velocity_raw.toString("hex") + ")");

    // BIT 182
    // Bx 0000 0000 0010 0000 0000 0000 0000 0000
    // -> 0000 0000 0000 0000 0000 0000 0000 0001 (0x1)
    var plunge_flag = (e_velocity_raw.readUInt32LE(0) >>> 21) & 0x1;
    this.logger.info("LTAS Frame - Plunge Mode: " + plunge_flag + " (LE 0x" + e_velocity_raw.toString("hex") + ")");

    // BITS 183-184
    // Bx 0000 0000 1100 0000 0000 0000 0000 0000
    // -> 0000 0000 0000 0000 0000 0000 0000 0011 (0x3)
    var pulse_width_raw = (e_velocity_raw.readUInt32LE(0) >>> 22) & 0x3;
    switch(pulse_width_raw) {
    case 0:
        var pulse_width = 1.0;
        break;
    case 1:
        var pulse_width = 2.4;
        break;
    case 2:
        var pulse_width = 5.0;
        break;
    case 3:
        var pulse_width = 10.0;
        break;
    default:
        var pulse_width = "Unknown";
        break;
    }
    this.logger.info("LTAS Frame - Pulse Width: " + pulse_width + " usec (LE 0x" + e_velocity_raw.toString("hex") + ")");

    // BIT 185
    // Bx 0000 0001 (0x1)
    var flags_raw = ltas_frame.slice(23, 24);
    var refraction_correction = flags_raw.readUInt8(0) & 0x1;
    this.logger.info("LTAS Frame - Refraction Correction: " + refraction_correction + " (" + flags_raw.toString("hex") + ")");

    // BIT 186
    // Bx 0000 0010
    // -> 0000 0001 (0x1)
    var droop = (flags_raw.readUInt8(0) >>> 1) & 0x1;
    this.logger.info("LTAS Frame - Droop: " + droop + " (" + flags_raw.toString("hex") + ")");

    // BIT 187
    // Bx 0000 0100
    // -> 0000 0001 (0x1)
    var paramp = (flags_raw.readUInt8(0) >>> 2) & 0x1;
    this.logger.info("LTAS Frame - Paramp: " + paramp + " (" + flags_raw.toString("hex") + ")");

    // BIT 188
    // Bx 0000 1000
    // -> 0000 0001 (0x1)
    var radiation = (flags_raw.readUInt8(0) >>> 3) & 0x1;
    this.logger.info("LTAS Frame - Radiation: " + radiation + " (" + flags_raw.toString("hex") + ")");

    // BIT 189
    // Bx 0001 0000
    // -> 0000 0001 (0x1)
    var local_oscillators = (flags_raw.readUInt8(0) >>> 4) & 0x1;
    this.logger.info("LTAS Frame - Local Oscillators: " + local_oscillators + " (" + flags_raw.toString("hex") + ")");

    // BIT 190
    // Bx 0010 0000
    // -> 0000 0001 (0x1)
    var beacon_skin = (flags_raw.readUInt8(0) >>> 5) & 0x1;
    this.logger.info("LTAS Frame - Beacon/Skin: " + beacon_skin + " (" + flags_raw.toString("hex") + ")");

    // BIT 191
    // Bx 0100 0000
    // -> 0000 0001 (0x1)
    var track_bit = (flags_raw.readUInt8(0) >>> 6) & 0x1;
    this.logger.info("LTAS Frame - Track Bit: " + track_bit + " (" + flags_raw.toString("hex") + ")");

    // BIT 192
    // Bx 1000 0000
    // -> 0000 0001 (0x1)
    var quality_bit = (flags_raw.readUInt8(0) >>> 7) & 0x1;
    this.logger.info("LTAS Frame - Quality Bit: " + quality_bit + " (" + flags_raw.toString("hex") + ")");

    // BITS 193-195
    // Bx 0000 0000 0000 0000 0000 0000 0000 0111 (0x7)
    var mode_raw = ltas_frame.slice(24, 28);
    var mode_num = mode_raw.readUInt32LE(0) & 0x7;
    switch(mode_num) {
    case 0:
        var mode = "Manual";
        break;
    case 1:
        var mode = "On-Axis Powered Flight";
        break;
    case 2:
        var mode = "Computer Drive";
        break;
    case 3:
        var mode = "Autotrack Coast";
        break;
    case 4:
        var mode = "Autotrack";
        break;
    case 5:
        var mode = "On-Axis Coast";
        break;
    case 6:
        var mode = "On-Axis Orbital";
        break;
    default:
        var mode = "Unknown";
        break;
    }
    this.logger.info("LTAS Frame - Mode: " + mode + " (LE 0x" + mode_raw.toString("hex") + ")");

    // BITS 196-209
    // Bx 0000 0000 0000 0001 1111 1111 1111 1000
    // -> 0000 0000 0000 0000 0011 1111 1111 1111 (0x3FFF)
    var g_velocity = (mode_raw.readUInt32LE(0) >>> 3) & 0x3FFF;
    this.logger.info("LTAS Frame - G Velocity Component: " + g_velocity + " (LE 0x" + mode_raw.toString("hex") + ")");

    // BIT 210
    // Bx 0000 0000 0000 0010 0000 0000 0000 0000
    // -> 0000 0000 0000 0000 0000 0000 0000 0001 (0x1)
    var g_vel_sign = (mode_raw.readUInt32LE(0) >>> 17) & 0x1;
    this.logger.info("LTAS Frame - G Velocity Component Sign: " + g_vel_sign + " (LE 0x" + mode_raw.toString("hex") + ")");

    // Indicates the G Velocity Component sign. If sign is negative (1) then
    // G Velocity Component is in Two's Complement.
    if (g_vel_sign == 1) {
        var g_velocity_corrected = -((g_velocity ^ 0x3FFF) + 1);
        this.logger.info("LTAS Frame - G Velocity Component Corrected: " + g_velocity_corrected);
    }

    // BITS 211-217
    // Bx 0000 0000 0000 0000 0000 0001 1111 1100
    // -> 0000 0000 0000 0000 0000 0000 0111 1111 (0x7F)
    var checksum_raw = ltas_frame.slice(26,30);
    var checksum = (checksum_raw.readUInt32LE(0) >>> 2) & 0x7F;
    this.logger.info("LTAS Frame - Checksum: " + checksum + " (LE 0x" + checksum_raw.toString("hex") + ")");

    // BITS 218-224
    // (spares)

    // BITS 225-240
    // (sync bytes already checked)

    return;
}

// Expose the UltraParser class to Node.js
module.exports = UltraParser;


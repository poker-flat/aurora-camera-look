/**
 * File: geomag.js
 * Author: Jonathan Sawyer
 * Copyright: 2012, Poker Flat Research Range, University of Alaska Fairbanks
 * License: MIT License
 */

// Requires
var geoMag = require('./lib/geomagJS/geomag.js');

var gm = geoMag(65, -147, /* optional, in feet */ 5280, /* optional */ new Date());

console.log(gm);

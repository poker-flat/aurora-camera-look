var geodetic = {};

//dist = cos I * (alt-100km)
//c = sin I * (alt-100km)
//a = cos D * c
//b = sin D * c

geodetic.wgs84 = {
    a: 6378137.0,
    recip_f: 298.257223563,
    b: 6356752.3142,
    e2: 0.00669437999014,
    ee2: 0.00673949674228
}

geodetic.DEG2RAD = 0.0174532925;
geodetic.RAD2DEG = 57.2957795;

// phi in radians
geodetic.N = function(phi) {
    var a = this.wgs84.a;
    var e2 = this.wgs84.e2;
    return a / (Math.sqrt(1 - (e2 * Math.sin(phi) * Math.sin(phi))));
}

geodetic.ECEFtoWGS84 = function(x, y, z) {
    return { e: x, f: y, g: z };
}

geodetic.WGS84toECEF = function(lat, lon, h) {
    var radLat = lat * this.DEG2RAD;
    var radLon = lon * this.DEG2RAD;
    var x = (this.N(radLat) + h) * Math.cos(radLat) * Math.cos(radLon);
    var y = (this.N(radLat) + h) * Math.cos(radLat) * Math.sin(radLon);
    var z = (this.N(radLat) * (1 - this.wgs84.e2) + h) * Math.sin(radLat);
    return { x: x, y: y, z: z }
}

exports = module.exports = geodetic;


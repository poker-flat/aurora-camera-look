var assert = require('assert');
var Point = require('../lib/Point.js');

/**
 * 3D Points
 */
describe("A suite of 3D Point tests", function() {
    var a, b, c;
    
    beforeEach(function() {
        a = new Point(-147.123456, 65.654321, 0);
        b = new Point(-147.0, 65.0, 100);
        c = null;
    });
    
    it("exists", function() {
        assert.notEqual(Point, undefined);
    });
    
    it("gives valid distance in kilometers when no argument is called", function() {
        assert.equal(a.geoDistanceTo3D(b), 124.13857860874971);
        assert.equal(b.geoDistanceTo3D(a), 124.13857860874971);
    });
    
    it("gives valid distance in kilometers when wrong argument is called", function() {
        assert.equal(a.geoDistanceTo3D(b, "foo"), 124.13857860874971);
        assert.equal(b.geoDistanceTo3D(a, "bar"), 124.13857860874971);
    });
    
    it("gives valid distance in kilometers", function() {
        assert.equal(a.geoDistanceTo3D(b, "km"), 124.13857860874971);
        assert.equal(b.geoDistanceTo3D(a, "km"), 124.13857860874971);
    });
    
    it("gives valid distance in nautical miles", function() {
        assert.equal(a.geoDistanceTo3D(b, "nmi"), 67.03029049636208);
        assert.equal(b.geoDistanceTo3D(a, "nmi"), 67.03029049636208);
    });
    
    it("gives valid distance in statute miles", function() {
        assert.equal(a.geoDistanceTo3D(b, "mi"), 77.13611793251013);
        assert.equal(b.geoDistanceTo3D(a, "mi"), 77.13611793251013);
    });
    
    it("gives valid bearing", function() {
        assert.equal(a.geoBearingTo(b), 175.44049997975748);
        assert.equal(b.geoBearingTo(a), 355.55268704404369);
    });
});

/**
 * 2D Points
 */
describe("A suite of Point tests", function() {
    var a, b, c;
    
    beforeEach(function() {
        a = new Point(-147.123456, 65.654321);
        b = new Point(-147.0, 65.0);
        c = null;
    });
    
    it("exists", function() {
        assert.notEqual(Point, undefined);
        //expect(Point).toBeDefined();
    });
    
    it("gives valid distance in kilometers when no argument is called", function() {
        assert.equal(a.geoDistanceTo(b), 72.982560054605955);
        assert.equal(b.geoDistanceTo(a), 72.982560054605955);
    });
    
    it("gives valid distance in kilometers when wrong argument is called", function() {
        assert.equal(a.geoDistanceTo(b, "foo"), 72.982560054605955);
        assert.equal(b.geoDistanceTo(a, "bar"), 72.982560054605955);
    });
    
    it("gives valid distance in kilometers", function() {
        assert.equal(a.geoDistanceTo(b, "km"), 72.982560054605955);
        assert.equal(b.geoDistanceTo(a, "km"), 72.982560054605955);
    });
    
    it("gives valid distance in nautical miles", function() {
        assert.equal(a.geoDistanceTo(b, "nmi"), 39.407422338359318);
        assert.equal(b.geoDistanceTo(a, "nmi"), 39.407422338359318);
    });
    
    it("gives valid distance in statute miles", function() {
        assert.equal(a.geoDistanceTo(b, "mi"), 45.349255106111436);
        assert.equal(b.geoDistanceTo(a, "mi"), 45.349255106111436);
    });
    
    it("gives valid bearing", function() {
        assert.equal(a.geoBearingTo(b), 175.44049997975748);
        assert.equal(b.geoBearingTo(a), 355.55268704404369);
    });
    
    describe("waypoint in kilometers", function() {
        beforeEach(function() {
            a = new Point(-147.123456, 65.654321);
            b = new Point(-147.0, 65.0);
            c = a.geoWaypoint(123.456, 78.90, 'km');
        });
        
        it("gives valid distance to waypoint", function() {
            assert.equal(a.geoDistanceTo(c), 123.45600000392685);
            assert.equal(b.geoDistanceTo(c), 150.3987625853371);
        });
        
        it("gives valid bearing to waypoint", function() {
            assert.equal(a.geoBearingTo(c), 78.899999989502163);
            assert.equal(b.geoBearingTo(c), 50.193482484463864);
        });
    });
    
    describe("waypoint in statute miles", function() {
        beforeEach(function() {
            a = new Point(-147.123456, 65.654321);
            b = new Point(-147.0, 65.0);
            c = a.geoWaypoint(123.456, 78.90, 'mi');
        });
        
        it("gives valid distance to waypoint", function() {
            assert.equal(a.geoDistanceTo(c), 198.68319585802084);
            assert.equal(b.geoDistanceTo(c), 219.32422216076554);
        });
        
        it("gives valid bearing to waypoint", function() {
            assert.equal(a.geoBearingTo(c), 78.899999993543972);
            assert.equal(b.geoBearingTo(c), 59.713917534888068);
        });
    });
    
    describe("waypoint in nautical miles", function() {
        beforeEach(function() {
            a = new Point(-147.123456, 65.654321);
            b = new Point(-147.0, 65.0);
            c = a.geoWaypoint(123.456, 78.90, 'nmi');
        });
        
        it("gives valid distance to waypoint", function() {
            // Fixing floating point precision -- some systems will fail this
            // spec at the 12th decimal place
            assert.equal(a.geoDistanceTo(c).toFixed(6), '228.640555');
            assert.equal(b.geoDistanceTo(c).toFixed(6), '247.794534');
        });
        
        it("gives valid bearing to waypoint", function() {
            assert.equal(a.geoBearingTo(c), 78.899999994413619);
            assert.equal(b.geoBearingTo(c), 62.005476897783133);
        });
    });
});

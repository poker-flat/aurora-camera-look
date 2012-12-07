Aurora Camera Look Angle
========================

This software listens on a UDP port for SIPS ELTAS messages, decomposes the
messages to obtain a position of a rocket in mid-flight. The software then
calculates where the rocket should be in 10 seconds and projects that point
100km above the earth to generate a camera look angle for ground based
observers.

Dependencies
============

Requires Mocha for testing:

$ npm install mocha

Run the server
==============

$ node server.js

Test with the client
====================

$ node client.js

Run unit tests
==============

$ mocha

View data with your web browser
===============================

$ node server

URL: http://localhost:8080/

Enter your geographic coordinates and elevation and submit, voila!

